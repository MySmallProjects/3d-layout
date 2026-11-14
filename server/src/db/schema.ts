import Database from 'better-sqlite3';
import { getDatabase } from './connection';

export const CURRENT_DB_SCHEMA_VERSION = 1;

export function initializeDatabase(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_models_folder_id ON models(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

    CREATE TABLE IF NOT EXISTS backgrounds (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnail_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scene_drafts (
      id TEXT PRIMARY KEY,
      scene_id TEXT,
      scene_name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Migrates an older restored SQLite database up to CURRENT_DB_SCHEMA_VERSION.
 */
export function migrateDatabase(db: Database.Database, fromVersion: number): void {
  if (fromVersion >= CURRENT_DB_SCHEMA_VERSION) return;

  // Ensure any newer tables exist on older backups
  db.exec(`
    CREATE TABLE IF NOT EXISTS backgrounds (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      thumbnail_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scene_drafts (
      id TEXT PRIMARY KEY,
      scene_id TEXT,
      scene_name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
