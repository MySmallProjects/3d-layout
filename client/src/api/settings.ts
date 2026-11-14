import { apiRequest } from './client';
import type { AppSettings } from '@shared/types/settings';

export async function fetchAppSettings(): Promise<AppSettings> {
  return apiRequest<AppSettings>('/api/settings');
}

export async function updateAppSettingsApi(patch: Partial<AppSettings>): Promise<AppSettings> {
  return apiRequest<AppSettings>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
