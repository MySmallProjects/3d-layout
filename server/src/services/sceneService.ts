import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/connection';
import { DATA_DIR, SCENE_THUMBNAILS_DIR } from '../config';
import { SceneData, SceneDraft, SceneListItem, SceneRecord } from '../../../shared/types';
import { sanitizeName } from '../utils/sanitize';

interface SceneRow {
  id: string;
  name: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
  data: string;
}

interface DraftRow {
  id: string;
  scene_id: string | null;
  scene_name: string;
  data: string;
  updated_at: string;
}

function saveSceneThumbnail(sceneId: string, dataUrl?: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `${sceneId}.png`;
  const fullPath = path.join(SCENE_THUMBNAILS_DIR, fileName);
  fs.writeFileSync(fullPath, buffer);
  return path.join('thumbnails', 'scenes', fileName);
}

export function listScenes(): SceneListItem[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT id, name, thumbnail_path, created_at, updated_at FROM scenes ORDER BY updated_at DESC')
    .all() as Omit<SceneRow, 'data'>[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    thumbnailPath: r.thumbnail_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

export function getScene(id: string): SceneRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as SceneRow | undefined;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    thumbnailPath: row.thumbnail_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: JSON.parse(row.data) as SceneData
  };
}

export function createScene(
  name: string,
  data: SceneData,
  thumbnailDataUrl?: string
): SceneRecord {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const cleanName = sanitizeName(name);
  const now = new Date().toISOString();
  const thumbnailPath = saveSceneThumbnail(id, thumbnailDataUrl);

  db.prepare(`
    INSERT INTO scenes (id, name, thumbnail_path, created_at, updated_at, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cleanName, thumbnailPath, now, now, JSON.stringify(data));

  return {
    id,
    name: cleanName,
    thumbnailPath,
    createdAt: now,
    updatedAt: now,
    data
  };
}

export function updateScene(
  id: string,
  name: string | undefined,
  data: SceneData,
  thumbnailDataUrl?: string
): SceneRecord {
  const db = getDatabase();
  const existing = getScene(id);
  if (!existing) {
    throw new Error(`Scene ${id} not found`);
  }

  const nextName = name ? sanitizeName(name) : existing.name;
  const now = new Date().toISOString();
  const newThumb = saveSceneThumbnail(id, thumbnailDataUrl);
  const thumbnailPath = newThumb || existing.thumbnailPath;

  db.prepare(`
    UPDATE scenes
    SET name = ?, thumbnail_path = ?, updated_at = ?, data = ?
    WHERE id = ?
  `).run(nextName, thumbnailPath, now, JSON.stringify(data), id);

  return {
    id,
    name: nextName,
    thumbnailPath,
    createdAt: existing.createdAt,
    updatedAt: now,
    data
  };
}

export function renameScene(id: string, name: string): SceneListItem {
  const db = getDatabase();
  const existing = getScene(id);
  if (!existing) {
    throw new Error(`Scene ${id} not found`);
  }
  const cleanName = sanitizeName(name);
  const now = new Date().toISOString();

  db.prepare('UPDATE scenes SET name = ?, updated_at = ? WHERE id = ?').run(cleanName, now, id);

  return {
    id,
    name: cleanName,
    thumbnailPath: existing.thumbnailPath,
    createdAt: existing.createdAt,
    updatedAt: now
  };
}

export function duplicateScene(id: string): SceneRecord {
  const db = getDatabase();
  const existing = getScene(id);
  if (!existing) {
    throw new Error(`Scene ${id} not found`);
  }

  const newId = crypto.randomUUID();
  const newName = sanitizeName(`Copy of ${existing.name}`);
  const now = new Date().toISOString();

  let newThumbPath: string | null = null;
  if (existing.thumbnailPath) {
    const srcThumb = path.join(DATA_DIR, existing.thumbnailPath);
    if (fs.existsSync(srcThumb)) {
      const destName = `${newId}.png`;
      const destThumb = path.join(SCENE_THUMBNAILS_DIR, destName);
      fs.copyFileSync(srcThumb, destThumb);
      newThumbPath = path.join('thumbnails', 'scenes', destName);
    }
  }

  db.prepare(`
    INSERT INTO scenes (id, name, thumbnail_path, created_at, updated_at, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newId, newName, newThumbPath, now, now, JSON.stringify(existing.data));

  return {
    id: newId,
    name: newName,
    thumbnailPath: newThumbPath,
    createdAt: now,
    updatedAt: now,
    data: existing.data
  };
}

export function deleteScene(id: string): void {
  const db = getDatabase();
  const existing = getScene(id);
  if (!existing) return;

  if (existing.thumbnailPath) {
    const fullThumb = path.join(DATA_DIR, existing.thumbnailPath);
    if (fs.existsSync(fullThumb)) {
      try {
        fs.unlinkSync(fullThumb);
      } catch (e) {
        console.error('Failed to delete scene thumbnail:', e);
      }
    }
  }

  db.prepare('DELETE FROM scenes WHERE id = ?').run(id);
}

// Draft Operations
export function getDraft(): SceneDraft | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM scene_drafts WHERE id = 'current'").get() as DraftRow | undefined;
  if (!row) return null;

  return {
    id: row.id,
    sceneId: row.scene_id,
    sceneName: row.scene_name,
    data: JSON.parse(row.data) as SceneData,
    updatedAt: row.updated_at
  };
}

export function saveDraft(sceneId: string | null, sceneName: string, data: SceneData): SceneDraft {
  const db = getDatabase();
  const now = new Date().toISOString();
  const cleanName = sanitizeName(sceneName || 'Untitled Scene');

  db.prepare(`
    INSERT INTO scene_drafts (id, scene_id, scene_name, data, updated_at)
    VALUES ('current', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      scene_id = excluded.scene_id,
      scene_name = excluded.scene_name,
      data = excluded.data,
      updated_at = excluded.updated_at
  `).run(sceneId, cleanName, JSON.stringify(data), now);

  return {
    id: 'current',
    sceneId,
    sceneName: cleanName,
    data,
    updatedAt: now
  };
}

export function clearDraft(): void {
  const db = getDatabase();
  db.prepare("DELETE FROM scene_drafts WHERE id = 'current'").run();
}
