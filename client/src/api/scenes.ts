import type { SceneData, SceneDraft, SceneListItem, SceneRecord } from '@shared/types/scene';
import { apiRequest } from './client';

export async function fetchScenes(): Promise<SceneListItem[]> {
  const res = await apiRequest<{ scenes: SceneListItem[] }>('/api/scenes');
  return res.scenes;
}

export async function fetchScene(id: string): Promise<SceneRecord> {
  return apiRequest<SceneRecord>(`/api/scenes/${encodeURIComponent(id)}`);
}

export async function createSceneApi(
  name: string,
  data: SceneData,
  thumbnailDataUrl?: string | null
): Promise<SceneRecord> {
  return apiRequest<SceneRecord>('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data, thumbnailDataUrl }),
  });
}

export async function updateSceneApi(
  id: string,
  payload: { name?: string; data?: SceneData; thumbnailDataUrl?: string | null }
): Promise<SceneRecord> {
  return apiRequest<SceneRecord>(`/api/scenes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function renameSceneApi(id: string, name: string): Promise<SceneRecord> {
  return apiRequest<SceneRecord>(`/api/scenes/${encodeURIComponent(id)}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function duplicateSceneApi(id: string): Promise<SceneRecord> {
  return apiRequest<SceneRecord>(`/api/scenes/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
  });
}

export async function deleteSceneApi(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(`/api/scenes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchDraftApi(): Promise<SceneDraft | null> {
  const res = await apiRequest<{ draft: SceneDraft | null }>('/api/scenes/draft/current');
  return res.draft;
}

export async function saveDraftApi(
  sceneId: string | null,
  sceneName: string,
  data: SceneData
): Promise<SceneDraft> {
  const res = await apiRequest<{ draft: SceneDraft }>('/api/scenes/draft/current', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneId, sceneName, data }),
  });
  return res.draft;
}

export async function clearDraftApi(): Promise<void> {
  await apiRequest<{ cleared: boolean }>('/api/scenes/draft/current', {
    method: 'DELETE',
  });
}
