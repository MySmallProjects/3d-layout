import path from 'path';
import fs from 'fs';

export const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * Finds the project root directory where version.json and data/ are located.
 */
export function getProjectRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '../../../..'),
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '..')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'version.json'))) {
      return candidate;
    }
  }
  return process.cwd();
}

export const PROJECT_ROOT = getProjectRoot();

// Allow overriding DATA_DIR via environment variable (e.g. /data in Docker)
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(PROJECT_ROOT, 'data');

export const MODELS_DIR = path.join(DATA_DIR, 'models');
export const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');
export const SCENE_THUMBNAILS_DIR = path.join(THUMBNAILS_DIR, 'scenes');
export const BACKGROUNDS_DIR = path.join(DATA_DIR, 'backgrounds');
export const DB_PATH = path.join(DATA_DIR, 'database.sqlite');
export const CLIENT_DIST = path.join(PROJECT_ROOT, 'client', 'dist');

// Configurable upload size limit: default 100MB
export const MAX_FILE_SIZE_BYTES = parseInt(
  process.env.MAX_FILE_SIZE_BYTES || String(100 * 1024 * 1024),
  10
);

// Ensure required directories exist
export function ensureDirectories(): void {
  for (const dir of [DATA_DIR, MODELS_DIR, THUMBNAILS_DIR, SCENE_THUMBNAILS_DIR, BACKGROUNDS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
