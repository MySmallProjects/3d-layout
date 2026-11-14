import { apiRequest } from './client';
import { Folder, FoldersListResponse } from '../types';

export async function fetchFolders(): Promise<FoldersListResponse> {
  return apiRequest<FoldersListResponse>('/api/folders');
}

export async function createFolderApi(name: string, parentId: string | null = null): Promise<Folder> {
  return apiRequest<Folder>('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentId })
  });
}

export async function renameFolderApi(id: string, name: string): Promise<Folder> {
  return apiRequest<Folder>(`/api/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name })
  });
}

export async function deleteFolderApi(id: string, deleteContents = false): Promise<void> {
  await apiRequest<void>(`/api/folders/${id}?deleteContents=${deleteContents}`, {
    method: 'DELETE'
  });
}
