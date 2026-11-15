import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/connection';
import { DATA_DIR, MODELS_DIR, THUMBNAILS_DIR } from '../config';
import { LibraryModel, ModelNormalisation, ModelOptimisation } from '../../../shared/types';
import { sanitizeName } from '../utils/sanitize';

interface ModelRow {
  id: string;
  name: string;
  folder_id: string | null;
  file_path: string;
  thumbnail_path: string | null;
  size_bytes: number;
  created_at: string;
  normalisation: string | null;
  optimisation: string | null;
  tags: string | null;
  last_used_at: string | null;
}

function parseJsonColumn<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function rowToModel(row: ModelRow): LibraryModel {
  const parsedTags = parseJsonColumn<unknown>(row.tags);
  const tags = Array.isArray(parsedTags)
    ? parsedTags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];
  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id,
    filePath: row.file_path,
    thumbnailPath: row.thumbnail_path,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    normalisation: parseJsonColumn<ModelNormalisation>(row.normalisation),
    optimisation: parseJsonColumn<ModelOptimisation>(row.optimisation),
    tags,
    lastUsedAt: row.last_used_at ?? null,
  };
}

export function listModels(folderId?: string | null, search?: string): LibraryModel[] {
  const db = getDatabase();
  let query = 'SELECT * FROM models WHERE 1=1';
  const params: unknown[] = [];

  if (folderId !== undefined) {
    if (folderId === null || folderId === '') {
      query += ' AND folder_id IS NULL';
    } else {
      query += ' AND folder_id = ?';
      params.push(folderId);
    }
  }

  if (search && search.trim()) {
    query += ' AND (name LIKE ? OR tags LIKE ?)';
    const pat = `%${search.trim()}%`;
    params.push(pat, pat);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as ModelRow[];
  return rows.map(rowToModel);
}

export function getModel(id: string): LibraryModel | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id) as ModelRow | undefined;
  return row ? rowToModel(row) : null;
}

export function createModel(
  originalName: string,
  folderId: string | null,
  tempFilePath: string,
  sizeBytes: number
): LibraryModel {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Strip extension for display name if .glb
  let cleanName = sanitizeName(originalName);
  if (cleanName.toLowerCase().endsWith('.glb')) {
    cleanName = cleanName.slice(0, -4);
  }

  // Validate folderId if provided
  if (folderId) {
    const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      folderId = null;
    }
  }

  // Target filename on disk: <id>.glb under models/
  const fileName = `${id}.glb`;
  const destinationPath = path.join(MODELS_DIR, fileName);
  const relativeFilePath = path.join('models', fileName);

  // Move uploaded file to permanent models directory
  fs.renameSync(tempFilePath, destinationPath);

  db.prepare(`
    INSERT INTO models (id, name, folder_id, file_path, thumbnail_path, size_bytes, created_at, normalisation)
    VALUES (?, ?, ?, ?, NULL, ?, ?, NULL)
  `).run(id, cleanName, folderId, relativeFilePath, sizeBytes, createdAt);

  return {
    id,
    name: cleanName,
    folderId,
    filePath: relativeFilePath,
    thumbnailPath: null,
    sizeBytes,
    createdAt,
    normalisation: null,
    tags: [],
    lastUsedAt: null,
  };
}

/**
 * Validates that a file on disk has a valid binary glTF 2.0 (.glb) header and JSON chunk.
 */
export function validateGlbBinaryFile(filePath: string): { valid: boolean; error?: string } {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 20) {
      return { valid: false, error: 'File is too small to be a valid binary GLB (< 20 bytes).' };
    }
    const fd = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(20);
      fs.readSync(fd, header, 0, 20, 0);
      const magic = header.readUInt32LE(0);
      if (magic !== 0x46546c67) {
        return { valid: false, error: 'Missing glTF binary magic header (not a valid .glb file).' };
      }
      const version = header.readUInt32LE(4);
      if (version !== 2) {
        return { valid: false, error: `Unsupported glTF version ${version} (only glTF 2.0 is supported).` };
      }
      const totalLength = header.readUInt32LE(8);
      if (totalLength > stat.size || totalLength < 20) {
        return { valid: false, error: 'Corrupt or truncated GLB file (declared length exceeds file size).' };
      }
      const jsonChunkLength = header.readUInt32LE(12);
      const jsonChunkType = header.readUInt32LE(16);
      if (jsonChunkType !== 0x4e4f534a || jsonChunkLength === 0 || 20 + jsonChunkLength > stat.size) {
        return { valid: false, error: 'Corrupt GLB JSON chunk header.' };
      }
      const jsonBuf = Buffer.alloc(jsonChunkLength);
      fs.readSync(fd, jsonBuf, 0, jsonChunkLength, 20);
      const parsed = JSON.parse(jsonBuf.toString('utf8')) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || !parsed.asset) {
        return { valid: false, error: 'Invalid glTF JSON root structure (missing "asset" property).' };
      }
      return { valid: true };
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? `Corrupt GLB content (${err.message})` : 'Corrupt GLB file.',
    };
  }
}

export function updateModelTags(id: string, tags: string[]): LibraryModel {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }
  const cleaned = Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((t) => (typeof t === 'string' ? t.trim().toLowerCase().slice(0, 32) : ''))
        .filter((t) => t.length > 0)
    )
  ).slice(0, 20);

  db.prepare('UPDATE models SET tags = ? WHERE id = ?').run(JSON.stringify(cleaned), id);
  return { ...model, tags: cleaned };
}

export function touchModelUsed(id: string): LibraryModel {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE models SET last_used_at = ? WHERE id = ?').run(now, id);
  return { ...model, lastUsedAt: now };
}

export function renameModel(id: string, name: string): LibraryModel {
  const db = getDatabase();
  const cleanName = sanitizeName(name);
  if (!cleanName) {
    throw new Error('Model name cannot be empty');
  }

  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }

  db.prepare('UPDATE models SET name = ? WHERE id = ?').run(cleanName, id);
  return { ...model, name: cleanName };
}

export function moveModel(id: string, folderId: string | null): LibraryModel {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }

  if (folderId) {
    const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      throw new Error(`Folder ${folderId} not found`);
    }
  }

  db.prepare('UPDATE models SET folder_id = ? WHERE id = ?').run(folderId, id);
  return { ...model, folderId };
}

export function deleteModel(id: string): void {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    return;
  }

  // Remove GLB file
  const fullModelPath = path.join(DATA_DIR, model.filePath);
  if (fs.existsSync(fullModelPath)) {
    try {
      fs.unlinkSync(fullModelPath);
    } catch (e) {
      console.error(`Failed to delete model file: ${fullModelPath}`, e);
    }
  }

  // Remove thumbnail file if exists
  if (model.thumbnailPath) {
    const fullThumbPath = path.join(DATA_DIR, model.thumbnailPath);
    if (fs.existsSync(fullThumbPath)) {
      try {
        fs.unlinkSync(fullThumbPath);
      } catch (e) {
        console.error(`Failed to delete thumbnail file: ${fullThumbPath}`, e);
      }
    }
  }

  // Remove original backup GLB if optimised
  if (model.optimisation?.originalFilePath) {
    const fullOriginalPath = path.join(DATA_DIR, model.optimisation.originalFilePath);
    if (fs.existsSync(fullOriginalPath)) {
      try {
        fs.unlinkSync(fullOriginalPath);
      } catch (e) {
        console.error(`Failed to delete original model file: ${fullOriginalPath}`, e);
      }
    }
  }

  db.prepare('DELETE FROM models WHERE id = ?').run(id);
}

export function saveThumbnail(id: string, imageBuffer: Buffer): string {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }

  const thumbFileName = `${id}.png`;
  const fullThumbPath = path.join(THUMBNAILS_DIR, thumbFileName);
  const relativeThumbPath = path.join('thumbnails', thumbFileName);

  fs.writeFileSync(fullThumbPath, imageBuffer);

  db.prepare('UPDATE models SET thumbnail_path = ? WHERE id = ?').run(relativeThumbPath, id);
  return relativeThumbPath;
}

function validateNormalisation(input: ModelNormalisation): ModelNormalisation {
  const { enabled, targetSize, scaleFactor, pivotOffset, rawDimensions } = input;
  if (typeof enabled !== 'boolean') {
    throw new Error('Normalisation "enabled" must be a boolean.');
  }
  if (typeof targetSize !== 'number' || !Number.isFinite(targetSize) || targetSize <= 0) {
    throw new Error('Normalisation "targetSize" must be a positive number.');
  }
  if (typeof scaleFactor !== 'number' || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    throw new Error('Normalisation "scaleFactor" must be a positive number.');
  }
  if (
    !Array.isArray(pivotOffset) ||
    pivotOffset.length !== 3 ||
    !pivotOffset.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    throw new Error('Normalisation "pivotOffset" must be [x, y, z] finite numbers.');
  }

  const sanitized: ModelNormalisation = {
    enabled,
    targetSize,
    scaleFactor,
    pivotOffset: [pivotOffset[0], pivotOffset[1], pivotOffset[2]],
  };

  if (
    Array.isArray(rawDimensions) &&
    rawDimensions.length === 3 &&
    rawDimensions.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    sanitized.rawDimensions = [rawDimensions[0], rawDimensions[1], rawDimensions[2]];
  }
  return sanitized;
}

export function updateModelNormalisation(
  id: string,
  normalisation: ModelNormalisation | null
): LibraryModel {
  const db = getDatabase();
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }

  const validated = normalisation ? validateNormalisation(normalisation) : null;
  const serialized = validated ? JSON.stringify(validated) : null;
  db.prepare('UPDATE models SET normalisation = ? WHERE id = ?').run(serialized, id);

  return {
    ...model,
    normalisation: validated,
  };
}
