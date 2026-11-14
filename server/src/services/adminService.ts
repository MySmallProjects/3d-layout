import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import type archiver from 'archiver';
import type { AdminOverview, BackupFileEntry, BackupManifest, StorageBreakdown } from '../../../shared/types/admin';
import type { VersionInfo } from '../../../shared/types/version';
import {
  BACKGROUNDS_DIR,
  DATA_DIR,
  DB_PATH,
  HDRIS_DIR,
  MODELS_DIR,
  PROJECT_ROOT,
  RENDERS_DIR,
  THUMBNAILS_DIR,
  ensureDirectories,
} from '../config';
import { closeDatabase, getDatabase } from '../db/connection';
import { CURRENT_DB_SCHEMA_VERSION, initializeDatabase } from '../db/schema';

export function getAppVersionInfo(): VersionInfo {
  const versionFilePath = path.join(PROJECT_ROOT, 'version.json');
  if (fs.existsSync(versionFilePath)) {
    return JSON.parse(fs.readFileSync(versionFilePath, 'utf-8')) as VersionInfo;
  }
  return { version: '1.0.0', buildNumber: 0, buildDate: new Date().toISOString() };
}

function getDirSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(full);
    } else if (entry.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function safeTableCount(tableName: string): number {
  const db = getDatabase();
  const exists = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  if (!exists) return 0;
  const row = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
  return row.count;
}

export function getAdminOverview(): AdminOverview {
  ensureDirectories();
  const ver = getAppVersionInfo();

  const modelsBytes = getDirSize(MODELS_DIR);
  const thumbnailsBytes = getDirSize(THUMBNAILS_DIR);
  const backgroundsBytes = getDirSize(BACKGROUNDS_DIR);
  const hdrisBytes = getDirSize(HDRIS_DIR);
  const rendersBytes = getDirSize(RENDERS_DIR);

  let dbBytes = 0;
  for (const suffix of ['', '-wal', '-shm']) {
    const p = `${DB_PATH}${suffix}`;
    if (fs.existsSync(p)) dbBytes += fs.statSync(p).size;
  }

  const totalBytes = getDirSize(DATA_DIR);
  const knownBytes =
    modelsBytes + thumbnailsBytes + backgroundsBytes + hdrisBytes + rendersBytes + dbBytes;
  const otherBytes = Math.max(0, totalBytes - knownBytes);

  const storage: StorageBreakdown = {
    models: modelsBytes,
    thumbnails: thumbnailsBytes,
    backgrounds: backgroundsBytes,
    hdris: hdrisBytes,
    renders: rendersBytes,
    database: dbBytes,
    other: otherBytes,
    total: totalBytes,
  };

  return {
    appVersion: ver.version,
    buildNumber: ver.buildNumber,
    buildDate: ver.buildDate,
    dbSchemaVersion: CURRENT_DB_SCHEMA_VERSION,
    counts: {
      models: safeTableCount('models'),
      folders: safeTableCount('folders'),
      scenes: safeTableCount('scenes'),
      backgrounds: safeTableCount('backgrounds'),
      hdris: safeTableCount('hdris'),
      renders: safeTableCount('renders'),
    },
    storage,
  };
}

function collectDataFiles(
  baseDir: string,
  currentDir: string,
  out: { fullPath: string; relPath: string; sizeBytes: number }[]
): void {
  if (!fs.existsSync(currentDir)) return;
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');

    // Skip live SQLite files (handled consistently via VACUUM INTO)
    if (
      relPath === 'database.sqlite' ||
      relPath === 'database.sqlite-wal' ||
      relPath === 'database.sqlite-shm'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      collectDataFiles(baseDir, fullPath, out);
    } else if (entry.isFile()) {
      out.push({ fullPath, relPath, sizeBytes: fs.statSync(fullPath).size });
    }
  }
}

export function buildBackupFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `scene-composer-backup-${datePart}-${timePart}.zip`;
}

/**
 * Streams a consistent backup zip (SQLite VACUUM INTO + /data files + manifest.json)
 * directly to the provided WritableStream without buffering the whole archive in memory.
 */
export async function createBackupArchive(outputStream: NodeJS.WritableStream): Promise<void> {
  ensureDirectories();
  const db = getDatabase();
  const tempDbPath = path.join(os.tmpdir(), `3d-layout-backup-${crypto.randomUUID()}.sqlite`);

  try {
    const escapedPath = tempDbPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${escapedPath}'`);
    const dbSize = fs.statSync(tempDbPath).size;

    const dataFiles: { fullPath: string; relPath: string; sizeBytes: number }[] = [];
    collectDataFiles(DATA_DIR, DATA_DIR, dataFiles);

    const overview = getAdminOverview();
    const manifestFiles: BackupFileEntry[] = [
      { path: 'database.sqlite', sizeBytes: dbSize },
      ...dataFiles.map((f) => ({ path: f.relPath, sizeBytes: f.sizeBytes })),
    ];

    const manifest: BackupManifest = {
      appVersion: overview.appVersion,
      buildNumber: overview.buildNumber,
      dbSchemaVersion: CURRENT_DB_SCHEMA_VERSION,
      sceneSchemaVersion: 1,
      timestamp: new Date().toISOString(),
      counts: overview.counts,
      files: manifestFiles,
    };

    const archiverMod = (await (Function('return import("archiver")')())) as {
      ZipArchive: new (options?: archiver.ArchiverOptions) => archiver.Archiver;
    };

    await new Promise<void>((resolve, reject) => {
      const archive = new archiverMod.ZipArchive({ zlib: { level: 6 } });

      outputStream.on('close', () => resolve());
      outputStream.on('finish', () => resolve());
      outputStream.on('error', (err) => reject(err));
      archive.on('error', (err: Error) => reject(err));

      archive.pipe(outputStream);
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
      archive.file(tempDbPath, { name: 'database.sqlite' });

      for (const file of dataFiles) {
        archive.file(file.fullPath, { name: file.relPath });
      }

      archive.finalize().catch(reject);
    });
  } finally {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
}

export function resetAllData(confirmation: string): void {
  if (confirmation !== 'RESET') {
    throw new Error('Confirmation text must be exactly "RESET".');
  }

  closeDatabase();

  if (fs.existsSync(DATA_DIR)) {
    for (const entry of fs.readdirSync(DATA_DIR)) {
      fs.rmSync(path.join(DATA_DIR, entry), { recursive: true, force: true });
    }
  }

  ensureDirectories();
  initializeDatabase();
}
