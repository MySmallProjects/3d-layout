import Database from 'better-sqlite3';
import { DB_PATH, ensureDirectories } from '../config';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    ensureDirectories();
    dbInstance = new Database(DB_PATH);
    // Performance and concurrency settings
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('busy_timeout = 5000');
    dbInstance.pragma('foreign_keys = ON');
  }
  return dbInstance;
}
