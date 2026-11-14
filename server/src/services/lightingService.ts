import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { HdriRecord, LightingConfig, LightingPresetRecord } from '../../../shared/types/lighting';
import { DATA_DIR, HDRIS_DIR, ensureDirectories } from '../config';
import { getDatabase } from '../db/connection';

export function listCustomPresets(): LightingPresetRecord[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, name, config, created_at FROM lighting_presets ORDER BY created_at DESC')
    .all() as { id: string; name: string; config: string; created_at: string }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    config: JSON.parse(r.config) as LightingConfig,
    createdAt: r.created_at,
  }));
}

export function createCustomPreset(name: string, config: LightingConfig): LightingPresetRecord {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Preset name is required.');

  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const storedConfig: LightingConfig = {
    ...config,
    presetId: id,
    presetName: trimmed,
  };

  db.prepare(`
    INSERT INTO lighting_presets (id, name, config, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, trimmed, JSON.stringify(storedConfig), now);

  return { id, name: trimmed, config: storedConfig, createdAt: now };
}

export function deleteCustomPreset(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM lighting_presets WHERE id = ?').run(id);
}

export function listHdris(): HdriRecord[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, name, file_path, size_bytes, created_at FROM hdris ORDER BY created_at DESC')
    .all() as { id: string; name: string; file_path: string; size_bytes: number; created_at: string }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    filePath: r.file_path,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  }));
}

export function getHdri(id: string): HdriRecord | null {
  const db = getDatabase();
  const r = db
    .prepare('SELECT id, name, file_path, size_bytes, created_at FROM hdris WHERE id = ?')
    .get(id) as
    | { id: string; name: string; file_path: string; size_bytes: number; created_at: string }
    | undefined;

  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    filePath: r.file_path,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
  };
}

export function createHdri(originalName: string, tempPath: string, sizeBytes: number): HdriRecord {
  ensureDirectories();
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.hdr' && ext !== '.exr') {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error('Only .hdr and .exr files are supported for HDRIs.');
  }

  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  const relPath = `hdris/${fileName}`;
  const destPath = path.join(HDRIS_DIR, fileName);
  fs.renameSync(tempPath, destPath);

  const displayName = path.basename(originalName, ext).trim() || 'HDRI';
  const now = new Date().toISOString();
  const db = getDatabase();

  db.prepare(`
    INSERT INTO hdris (id, name, file_path, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, displayName, relPath, sizeBytes, now);

  return {
    id,
    name: displayName,
    filePath: relPath,
    sizeBytes,
    createdAt: now,
  };
}

export function deleteHdri(id: string): void {
  const existing = getHdri(id);
  if (!existing) return;

  const fullPath = path.resolve(DATA_DIR, existing.filePath);
  if (fullPath.startsWith(DATA_DIR + path.sep) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  const db = getDatabase();
  db.prepare('DELETE FROM hdris WHERE id = ?').run(id);
}
