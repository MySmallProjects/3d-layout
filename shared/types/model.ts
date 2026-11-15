export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface ModelNormalisation {
  enabled: boolean;
  targetSize: number;
  scaleFactor: number;
  pivotOffset: [number, number, number];
  rawDimensions?: [number, number, number];
}

export interface ModelOptimisation {
  optimised: boolean;
  originalFilePath: string;
  originalSizeBytes: number;
  optimisedSizeBytes: number;
  maxTextureSize: number;
  webpQuality: number;
  optimisedAt: string;
}

export interface LibraryModel {
  id: string;
  name: string;
  folderId: string | null;
  filePath: string;
  thumbnailPath: string | null;
  sizeBytes: number;
  createdAt: string;
  normalisation?: ModelNormalisation | null;
  optimisation?: ModelOptimisation | null;
  tags?: string[];
  lastUsedAt?: string | null;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
  modelCount: number;
}
