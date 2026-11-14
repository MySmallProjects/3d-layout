import type { HdriRecord, LightingConfig, LightingPresetRecord } from '@shared/types/lighting';
import { apiRequest } from './client';

export async function fetchCustomPresets(): Promise<LightingPresetRecord[]> {
  const res = await apiRequest<{ presets: LightingPresetRecord[] }>('/api/lighting/presets');
  return res.presets;
}

export async function createCustomPresetApi(
  name: string,
  config: LightingConfig
): Promise<LightingPresetRecord> {
  return apiRequest<LightingPresetRecord>('/api/lighting/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, config }),
  });
}

export async function deleteCustomPresetApi(id: string): Promise<void> {
  await apiRequest<void>(`/api/lighting/presets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchHdris(): Promise<HdriRecord[]> {
  const res = await apiRequest<{ hdris: HdriRecord[] }>('/api/lighting/hdris');
  return res.hdris;
}

export async function uploadHdriApi(file: File): Promise<HdriRecord> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/lighting/hdris', {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to upload HDRI');
  }
  return json.data as HdriRecord;
}

export async function deleteHdriApi(id: string): Promise<void> {
  await apiRequest<void>(`/api/lighting/hdris/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
