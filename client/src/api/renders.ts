import type { CameraState } from '@shared/types/scene';
import type { RenderRecord, RenderSettings } from '@shared/types/render';
import { apiRequest } from './client';

export async function fetchRenders(sort: 'asc' | 'desc' = 'desc', sceneId?: string): Promise<RenderRecord[]> {
  const params = new URLSearchParams({ sort });
  if (sceneId) params.set('sceneId', sceneId);
  const res = await apiRequest<{ renders: RenderRecord[] }>(`/api/renders?${params.toString()}`);
  return res.renders;
}

export async function createRenderApi(payload: {
  name: string;
  sceneId: string | null;
  sceneName: string;
  width: number;
  height: number;
  settings: RenderSettings;
  camera: CameraState;
  imageDataUrl: string;
  thumbnailDataUrl?: string;
}): Promise<RenderRecord> {
  return apiRequest<RenderRecord>('/api/renders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function renameRenderApi(id: string, name: string): Promise<RenderRecord> {
  return apiRequest<RenderRecord>(`/api/renders/${encodeURIComponent(id)}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteRenderApi(id: string): Promise<void> {
  await apiRequest<void>(`/api/renders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
