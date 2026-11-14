import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { CameraState } from '../../../shared/types/scene';
import type { RenderRecord, RenderSettings } from '../../../shared/types/render';
import { DATA_DIR, RENDERS_DIR, RENDER_THUMBNAILS_DIR, ensureDirectories } from '../config';
import { getDatabase } from '../db/connection';

interface RenderRow {
  id: string;
  name: string;
  scene_id: string | null;
  scene_name: string;
  camera_name: string | null;
  file_path: string;
  thumbnail_path: string;
  width: number;
  height: number;
  created_at: string;
  settings: string;
  camera: string;
}

function rowToRecord(r: RenderRow): RenderRecord {
  return {
    id: r.id,
    name: r.name,
    sceneId: r.scene_id,
    sceneName: r.scene_name,
    cameraName: r.camera_name ?? null,
    filePath: r.file_path,
    thumbnailPath: r.thumbnail_path,
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
    settings: JSON.parse(r.settings) as RenderSettings,
    camera: JSON.parse(r.camera) as CameraState,
  };
}

function decodePngDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('Invalid PNG data URL.');
  }
  return Buffer.from(match[1], 'base64');
}

export function listRenders(sort: 'asc' | 'desc' = 'desc', sceneId?: string): RenderRecord[] {
  const db = getDatabase();
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  const rows = sceneId
    ? (db
        .prepare(`SELECT * FROM renders WHERE scene_id = ? ORDER BY created_at ${order}`)
        .all(sceneId) as RenderRow[])
    : (db.prepare(`SELECT * FROM renders ORDER BY created_at ${order}`).all() as RenderRow[]);

  return rows.map(rowToRecord);
}

export function getRender(id: string): RenderRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM renders WHERE id = ?').get(id) as RenderRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createRender(params: {
  name: string;
  sceneId: string | null;
  sceneName: string;
  cameraName?: string | null;
  width: number;
  height: number;
  settings: RenderSettings;
  camera: CameraState;
  imageDataUrl: string;
  thumbnailDataUrl?: string;
}): RenderRecord {
  ensureDirectories();
  const id = crypto.randomUUID();
  const fileName = `${id}.png`;
  const thumbFileName = `${id}.png`;
  const relFile = `renders/${fileName}`;
  const relThumb = `thumbnails/renders/${thumbFileName}`;

  const pngBuf = decodePngDataUrl(params.imageDataUrl);
  fs.writeFileSync(path.join(RENDERS_DIR, fileName), pngBuf);

  const thumbBuf = params.thumbnailDataUrl ? decodePngDataUrl(params.thumbnailDataUrl) : pngBuf;
  fs.writeFileSync(path.join(RENDER_THUMBNAILS_DIR, thumbFileName), thumbBuf);

  const now = new Date().toISOString();
  const cleanName = params.name.trim() || `${params.sceneName || 'Scene'} Render`;
  const cleanCameraName = params.cameraName?.trim() ? params.cameraName.trim() : null;
  const db = getDatabase();

  db.prepare(`
    INSERT INTO renders (
      id, name, scene_id, scene_name, camera_name, file_path, thumbnail_path,
      width, height, created_at, settings, camera
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cleanName,
    params.sceneId,
    params.sceneName || 'Untitled Scene',
    cleanCameraName,
    relFile,
    relThumb,
    params.width,
    params.height,
    now,
    JSON.stringify(params.settings),
    JSON.stringify(params.camera)
  );

  return {
    id,
    name: cleanName,
    sceneId: params.sceneId,
    sceneName: params.sceneName || 'Untitled Scene',
    cameraName: cleanCameraName,
    filePath: relFile,
    thumbnailPath: relThumb,
    width: params.width,
    height: params.height,
    createdAt: now,
    settings: params.settings,
    camera: params.camera,
  };
}

export function renameRender(id: string, name: string): RenderRecord {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Render name is required.');
  const db = getDatabase();
  db.prepare('UPDATE renders SET name = ? WHERE id = ?').run(trimmed, id);
  const updated = getRender(id);
  if (!updated) throw new Error('Render not found.');
  return updated;
}

export function deleteRender(id: string): void {
  const existing = getRender(id);
  if (!existing) return;

  for (const rel of [existing.filePath, existing.thumbnailPath]) {
    const full = path.resolve(DATA_DIR, rel);
    if (full.startsWith(DATA_DIR + path.sep) && fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
  }

  const db = getDatabase();
  db.prepare('DELETE FROM renders WHERE id = ?').run(id);
}
