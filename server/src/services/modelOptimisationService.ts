import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR, MODEL_ORIGINALS_DIR, ensureDirectories } from '../config';
import { getDatabase } from '../db/connection';
import type { LibraryModel, ModelOptimisation } from '../../../shared/types';
import { getModel } from './modelService';
import { getAppSettings } from './settingsService';
import { optimiseGlbFile } from './glbOptimiser';

export interface OptimiseRequestOptions {
  maxTextureSize?: number;
  webpQuality?: number;
}

/**
 * Optimises an existing model GLB (Meshopt + WebP resize), preserving its
 * un-optimised original under `models/originals/<id>.glb` for lossless revert & backups.
 */
export async function optimiseModelById(
  id: string,
  opts?: OptimiseRequestOptions
): Promise<LibraryModel> {
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }

  ensureDirectories();

  const activeFullPath = path.join(DATA_DIR, model.filePath);
  if (!fs.existsSync(activeFullPath)) {
    throw new Error('Active GLB file missing on disk');
  }

  const originalRelPath = model.optimisation?.originalFilePath || path.join('models', 'originals', `${id}.glb`);
  const originalFullPath = path.join(DATA_DIR, originalRelPath);

  // Back up the untouched original before modifying active file
  let copiedOriginalNow = false;
  if (!fs.existsSync(originalFullPath)) {
    fs.copyFileSync(activeFullPath, originalFullPath);
    copiedOriginalNow = true;
  }

  const originalSizeBytes = fs.statSync(originalFullPath).size;
  const appOpts = getAppSettings().optimisation;
  const maxTextureSize =
    typeof opts?.maxTextureSize === 'number' && Number.isFinite(opts.maxTextureSize) && opts.maxTextureSize >= 64
      ? Math.min(8192, Math.max(64, Math.round(opts.maxTextureSize)))
      : appOpts.maxTextureSize;
  const webpQuality =
    typeof opts?.webpQuality === 'number' && Number.isFinite(opts.webpQuality)
      ? Math.min(100, Math.max(10, Math.round(opts.webpQuality)))
      : appOpts.webpQuality;

  const tempOut = path.join(os.tmpdir(), `3d-layout-opt-${crypto.randomUUID()}.glb`);

  try {
    await optimiseGlbFile(originalFullPath, tempOut, { maxTextureSize, webpQuality });

    const optimisedSizeBytes = fs.statSync(tempOut).size;
    if (optimisedSizeBytes <= 0) {
      throw new Error('Optimiser produced an empty GLB file.');
    }

    fs.copyFileSync(tempOut, activeFullPath);

    const optMeta: ModelOptimisation = {
      optimised: true,
      originalFilePath: originalRelPath.split(path.sep).join('/'),
      originalSizeBytes,
      optimisedSizeBytes,
      maxTextureSize,
      webpQuality,
      optimisedAt: new Date().toISOString(),
    };

    const db = getDatabase();
    db.prepare('UPDATE models SET size_bytes = ?, optimisation = ? WHERE id = ?').run(
      optimisedSizeBytes,
      JSON.stringify(optMeta),
      id
    );

    return {
      ...model,
      sizeBytes: optimisedSizeBytes,
      optimisation: optMeta,
    };
  } catch (err) {
    // Clean up newly created original backup if this very first optimisation failed
    if (copiedOriginalNow && fs.existsSync(originalFullPath)) {
      fs.rmSync(originalFullPath, { force: true });
    }
    throw err;
  } finally {
    if (fs.existsSync(tempOut)) {
      fs.rmSync(tempOut, { force: true });
    }
  }
}

/**
 * Reverts an optimised model back to its stored original GLB file and removes the backup copy.
 */
export function revertModelById(id: string): LibraryModel {
  const model = getModel(id);
  if (!model) {
    throw new Error(`Model ${id} not found`);
  }
  if (!model.optimisation?.originalFilePath) {
    throw new Error('This model does not have a saved original file to revert to.');
  }

  const activeFullPath = path.join(DATA_DIR, model.filePath);
  const originalFullPath = path.join(DATA_DIR, model.optimisation.originalFilePath);
  if (!fs.existsSync(originalFullPath)) {
    throw new Error('Original GLB file is missing on disk.');
  }

  const originalSizeBytes = fs.statSync(originalFullPath).size;
  fs.copyFileSync(originalFullPath, activeFullPath);
  fs.unlinkSync(originalFullPath);

  // Ensure models/originals/ stays tidy
  if (!fs.existsSync(MODEL_ORIGINALS_DIR)) {
    fs.mkdirSync(MODEL_ORIGINALS_DIR, { recursive: true });
  }

  const db = getDatabase();
  db.prepare('UPDATE models SET size_bytes = ?, optimisation = NULL WHERE id = ?').run(
    originalSizeBytes,
    id
  );

  return {
    ...model,
    sizeBytes: originalSizeBytes,
    optimisation: null,
  };
}
