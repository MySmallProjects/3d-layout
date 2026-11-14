import { getDatabase } from './connection';

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
  `);
}
