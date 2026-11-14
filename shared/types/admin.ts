export interface StorageBreakdown {
  models: number;
  thumbnails: number;
  backgrounds: number;
  hdris: number;
  renders: number;
  database: number;
  other: number;
  total: number;
}

export interface AdminCounts {
  models: number;
  folders: number;
  scenes: number;
  backgrounds: number;
  hdris: number;
  renders: number;
}

export interface AdminOverview {
  appVersion: string;
  buildNumber: number;
  buildDate: string;
  dbSchemaVersion: number;
  counts: AdminCounts;
  storage: StorageBreakdown;
}

export interface BackupFileEntry {
  path: string;
  sizeBytes: number;
}

export interface BackupManifest {
  appVersion: string;
  buildNumber: number;
  dbSchemaVersion: number;
  sceneSchemaVersion: number;
  timestamp: string;
  counts: AdminCounts;
  files: BackupFileEntry[];
}

export interface RestoreValidationResult {
  token: string;
  manifest: BackupManifest;
  totalSizeBytes: number;
  fileCount: number;
  requiresMigration: boolean;
  warnings: string[];
}
