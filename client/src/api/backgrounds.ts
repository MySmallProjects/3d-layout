import { apiRequest } from './client';
import { BackgroundItem, BackgroundsListResponse } from '../types';

export async function fetchBackgrounds(): Promise<BackgroundsListResponse> {
  return apiRequest<BackgroundsListResponse>('/api/backgrounds');
}

export async function uploadBackgroundApi(file: File): Promise<BackgroundItem> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<BackgroundItem>('/api/backgrounds/upload', {
    method: 'POST',
    body: formData
  });
}

export async function deleteBackgroundApi(id: string): Promise<void> {
  await apiRequest<void>(`/api/backgrounds/${id}`, {
    method: 'DELETE'
  });
}
