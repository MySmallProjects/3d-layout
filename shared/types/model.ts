export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface LibraryModel {
  id: string;
  name: string;
  folderId: string | null;
  filePath: string;
  thumbnailPath: string | null;
  sizeBytes: number;
  createdAt: string;
}

export interface FolderNode extends Folder {
  children: FolderNode[];
  modelCount: number;
}
