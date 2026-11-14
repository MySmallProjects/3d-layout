import { apiRequest } from './client';
import { LibraryModel, ModelNormalisation, ModelsListResponse } from '../types';

export async function fetchModels(
  folderId?: string | null,
  search?: string
): Promise<ModelsListResponse> {
  const params = new URLSearchParams();
  if (folderId !== undefined) {
    params.set('folderId', folderId === null ? '' : folderId);
  }
  if (search) {
    params.set('search', search);
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ModelsListResponse>(`/api/models${queryString}`);
}

export async function uploadModelsApi(
  files: File[],
  folderId: string | null = null
): Promise<{ models: LibraryModel[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (folderId) {
    formData.append('folderId', folderId);
  }

  return apiRequest<{ models: LibraryModel[] }>('/api/models/upload', {
    method: 'POST',
    body: formData
  });
}

export async function renameModelApi(id: string, name: string): Promise<LibraryModel> {
  return apiRequest<LibraryModel>(`/api/models/${id}/rename`, {
    method: 'PATCH',
    body: JSON.stringify({ name })
  });
}

export async function moveModelApi(
  id: string,
  folderId: string | null
): Promise<LibraryModel> {
  return apiRequest<LibraryModel>(`/api/models/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ folderId })
  });
}

export async function deleteModelApi(id: string): Promise<void> {
  await apiRequest<void>(`/api/models/${id}`, {
    method: 'DELETE'
  });
}

export async function uploadThumbnailApi(
  id: string,
  dataUrl: string
): Promise<{ thumbnailPath: string }> {
  return apiRequest<{ thumbnailPath: string }>(`/api/models/${id}/thumbnail`, {
    method: 'POST',
    body: JSON.stringify({ dataUrl })
  });
}

export async function updateModelNormalisationApi(
  id: string,
  normalisation: ModelNormalisation | null
): Promise<LibraryModel> {
  return apiRequest<LibraryModel>(`/api/models/${id}/normalisation`, {
    method: 'PATCH',
    body: JSON.stringify({ normalisation })
  });
}
