import type { AdminOverview, RestoreValidationResult } from '@shared/types/admin';
import { apiRequest, getStoredAdminPassword } from './client';

export interface AdminAuthStatus {
  passwordRequired: boolean;
  authenticated: boolean;
}

export async function fetchAdminAuthStatus(): Promise<AdminAuthStatus> {
  return apiRequest<AdminAuthStatus>('/api/admin/auth-status');
}

export async function verifyAdminPasswordApi(password: string): Promise<{ authenticated: boolean }> {
  return apiRequest<{ authenticated: boolean }>('/api/admin/auth-verify', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return apiRequest<AdminOverview>('/api/admin/overview');
}

export function getBackupDownloadUrl(): string {
  const pwd = getStoredAdminPassword();
  if (pwd) {
    return `/api/admin/backup?adminPassword=${encodeURIComponent(pwd)}`;
  }
  return '/api/admin/backup';
}

export function validateBackupFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<RestoreValidationResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/restore/validate');
    const pwd = getStoredAdminPassword();
    if (pwd) {
      xhr.setRequestHeader('X-Admin-Password', pwd);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json.data as RestoreValidationResult);
        } else {
          reject(new Error(json.error || `Validation failed (${xhr.status})`));
        }
      } catch {
        reject(new Error(`Invalid server response (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during backup upload.'));

    const formData = new FormData();
    formData.append('backup', file);
    xhr.send(formData);
  });
}

export async function confirmRestoreApi(token: string): Promise<void> {
  await apiRequest<{ restored: boolean }>('/api/admin/restore/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export async function discardRestoreApi(token: string): Promise<void> {
  await apiRequest<void>(`/api/admin/restore/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
}

export async function resetAllDataApi(confirmation: string): Promise<void> {
  await apiRequest<{ reset: boolean }>('/api/admin/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  });
}
