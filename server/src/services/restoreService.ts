import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import yauzl from 'yauzl';
import Database from 'better-sqlite3';
import type { BackupManifest, RestoreValidationResult } from '../../../shared/types/admin';
import { DATA_DIR, ensureDirectories } from '../config';
import { closeDatabase } from '../db/connection';
import { CURRENT_DB_SCHEMA_VERSION, initializeDatabase, migrateDatabase } from '../db/schema';

interface PendingRestore {
  zipPath: string;
  manifest: BackupManifest;
  createdAt: number;
}

const pendingRestores = new Map<string, PendingRestore>();
const TOKEN_TTL_MS = 15 * 60 * 1000;

function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, item] of pendingRestores.entries()) {
    if (now - item.createdAt > TOKEN_TTL_MS) {
      pendingRestores.delete(token);
      if (fs.existsSync(item.zipPath)) {
        fs.rmSync(item.zipPath, { force: true });
      }
    }
  }
}

export function assertSafeZipEntryPath(entryName: string): string {
  if (!entryName || entryName.includes('\0') || entryName.includes('\\')) {
    throw new Error(`Unsafe zip entry path: "${entryName}"`);
  }
  if (entryName.startsWith('/')) {
    throw new Error(`Absolute zip entry path rejected: "${entryName}"`);
  }
  const normalized = path.posix.normalize(entryName);
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Path traversal detected in zip entry: "${entryName}"`);
  }
  return normalized;
}

function readStreamWithLimit(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Manifest exceeds maximum allowed size.'));
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function validateBackupZip(zipPath: string): Promise<RestoreValidationResult> {
  cleanupExpiredTokens();

  let manifest: BackupManifest | null = null;
  let hasDatabase = false;
  let fileCount = 0;
  let totalSizeBytes = 0;

  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new Error('Invalid or corrupted zip archive.'));
        return;
      }

      zipfile.readEntry();
      zipfile.on('entry', (entry: yauzl.Entry) => {
        try {
          const safePath = assertSafeZipEntryPath(entry.fileName);

          if (safePath.endsWith('/')) {
            zipfile.readEntry();
            return;
          }

          fileCount += 1;
          if (fileCount > 100000) {
            zipfile.close();
            reject(new Error('Backup archive contains too many files.'));
            return;
          }
          if (entry.uncompressedSize > 5 * 1024 * 1024 * 1024) {
            zipfile.close();
            reject(new Error(`Entry "${safePath}" exceeds 5GB size limit.`));
            return;
          }
          totalSizeBytes += entry.uncompressedSize;

          if (safePath === 'database.sqlite') {
            hasDatabase = true;
            zipfile.readEntry();
            return;
          }

          if (safePath === 'manifest.json') {
            zipfile.openReadStream(entry, async (streamErr, readStream) => {
              if (streamErr || !readStream) {
                zipfile.close();
                reject(new Error('Failed to read manifest.json from archive.'));
                return;
              }
              try {
                const buf = await readStreamWithLimit(readStream, 10 * 1024 * 1024);
                manifest = JSON.parse(buf.toString('utf-8')) as BackupManifest;
                zipfile.readEntry();
              } catch (parseErr) {
                zipfile.close();
                reject(parseErr);
              }
            });
            return;
          }

          zipfile.readEntry();
        } catch (entryErr) {
          zipfile.close();
          reject(entryErr);
        }
      });

      zipfile.on('end', () => resolve());
      zipfile.on('error', (zipErr) => reject(zipErr));
    });
  });

  if (!manifest) {
    throw new Error('Invalid backup: manifest.json is missing.');
  }
  const parsedManifest = manifest as BackupManifest;
  if (
    typeof parsedManifest.dbSchemaVersion !== 'number' ||
    typeof parsedManifest.appVersion !== 'string' ||
    !parsedManifest.counts ||
    !Array.isArray(parsedManifest.files)
  ) {
    throw new Error('Invalid backup: manifest.json has unexpected structure.');
  }
  if (!hasDatabase) {
    throw new Error('Invalid backup: database.sqlite is missing.');
  }
  if (parsedManifest.dbSchemaVersion > CURRENT_DB_SCHEMA_VERSION) {
    throw new Error(
      `Backup is from a newer schema version (${parsedManifest.dbSchemaVersion} > ${CURRENT_DB_SCHEMA_VERSION}) and cannot be restored.`
    );
  }

  const warnings: string[] = [];
  const requiresMigration = parsedManifest.dbSchemaVersion < CURRENT_DB_SCHEMA_VERSION;
  if (requiresMigration) {
    warnings.push(
      `Backup uses older schema v${parsedManifest.dbSchemaVersion}; it will be migrated to v${CURRENT_DB_SCHEMA_VERSION}.`
    );
  }

  const token = crypto.randomUUID();
  pendingRestores.set(token, {
    zipPath,
    manifest: parsedManifest,
    createdAt: Date.now(),
  });

  return {
    token,
    manifest: parsedManifest,
    totalSizeBytes,
    fileCount,
    requiresMigration,
    warnings,
  };
}

function extractZipToDir(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new Error('Failed to open backup zip for extraction.'));
        return;
      }

      zipfile.readEntry();
      zipfile.on('entry', (entry: yauzl.Entry) => {
        try {
          const safePath = assertSafeZipEntryPath(entry.fileName);
          if (safePath === 'manifest.json' || safePath.endsWith('/')) {
            zipfile.readEntry();
            return;
          }

          const targetPath = path.resolve(destDir, safePath);
          if (!targetPath.startsWith(destDir + path.sep)) {
            throw new Error(`Extraction path escapes staging directory: "${safePath}"`);
          }

          fs.mkdirSync(path.dirname(targetPath), { recursive: true });

          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) {
              zipfile.close();
              reject(streamErr || new Error(`Failed to read ${safePath}`));
              return;
            }
            const writeStream = fs.createWriteStream(targetPath);
            readStream.pipe(writeStream);
            writeStream.on('finish', () => zipfile.readEntry());
            writeStream.on('error', (wErr) => {
              zipfile.close();
              reject(wErr);
            });
          });
        } catch (entryErr) {
          zipfile.close();
          reject(entryErr);
        }
      });

      zipfile.on('end', () => resolve());
      zipfile.on('error', (zipErr) => reject(zipErr));
    });
  });
}

function moveEntry(src: string, dest: string): void {
  try {
    fs.renameSync(src, dest);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EXDEV' || code === 'ENOTEMPTY' || code === 'EEXIST') {
      fs.cpSync(src, dest, { recursive: true, force: true });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export async function confirmRestoreBackup(token: string): Promise<void> {
  const pending = pendingRestores.get(token);
  if (!pending) {
    throw new Error('Restore session expired or invalid. Please re-upload the backup zip.');
  }
  pendingRestores.delete(token);

  const stagingDir = path.join(os.tmpdir(), `3d-layout-restore-${crypto.randomUUID()}`);
  const rollbackDir = path.join(os.tmpdir(), `3d-layout-rollback-${crypto.randomUUID()}`);

  try {
    fs.mkdirSync(stagingDir, { recursive: true });
    await extractZipToDir(pending.zipPath, stagingDir);

    const stagedDbPath = path.join(stagingDir, 'database.sqlite');
    if (!fs.existsSync(stagedDbPath)) {
      throw new Error('Restored archive is missing database.sqlite.');
    }

    // Validate SQLite integrity and run migrations on staged DB before touching live data
    const tempDb = new Database(stagedDbPath);
    try {
      const check = tempDb.pragma('integrity_check', { simple: true });
      if (check !== 'ok') {
        throw new Error(`Database integrity check failed: ${String(check)}`);
      }
      if (pending.manifest.dbSchemaVersion < CURRENT_DB_SCHEMA_VERSION) {
        migrateDatabase(tempDb, pending.manifest.dbSchemaVersion);
      }
    } finally {
      tempDb.close();
    }

    // Close live DB and swap DATA_DIR contents atomically with rollback protection
    closeDatabase();
    fs.mkdirSync(rollbackDir, { recursive: true });

    try {
      if (fs.existsSync(DATA_DIR)) {
        for (const entry of fs.readdirSync(DATA_DIR)) {
          moveEntry(path.join(DATA_DIR, entry), path.join(rollbackDir, entry));
        }
      }
      fs.mkdirSync(DATA_DIR, { recursive: true });
      for (const entry of fs.readdirSync(stagingDir)) {
        moveEntry(path.join(stagingDir, entry), path.join(DATA_DIR, entry));
      }
      ensureDirectories();
      initializeDatabase();
    } catch (swapErr) {
      // Roll back live data if swap failed
      if (fs.existsSync(DATA_DIR)) {
        for (const entry of fs.readdirSync(DATA_DIR)) {
          fs.rmSync(path.join(DATA_DIR, entry), { recursive: true, force: true });
        }
      }
      for (const entry of fs.readdirSync(rollbackDir)) {
        moveEntry(path.join(rollbackDir, entry), path.join(DATA_DIR, entry));
      }
      initializeDatabase();
      throw swapErr;
    }
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    fs.rmSync(rollbackDir, { recursive: true, force: true });
    fs.rmSync(pending.zipPath, { force: true });
  }
}

export function discardRestoreToken(token: string): void {
  const pending = pendingRestores.get(token);
  if (pending) {
    pendingRestores.delete(token);
    fs.rmSync(pending.zipPath, { force: true });
  }
}
