import { Folder, LibraryModel, FolderNode } from './model';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string | null;
}

export interface RenameFolderRequest {
  name: string;
}

export interface RenameModelRequest {
  name: string;
}

export interface MoveModelRequest {
  folderId: string | null;
}

export interface DeleteFolderQuery {
  deleteContents?: boolean;
}

export interface ModelsListResponse {
  models: LibraryModel[];
}

export interface FoldersListResponse {
  folders: Folder[];
  tree: FolderNode[];
}
