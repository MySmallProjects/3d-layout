import { ApiResponse } from '../types';

export const ADMIN_PASSWORD_STORAGE_KEY = '3d_layout_admin_password';

export function getStoredAdminPassword(): string {
  try {
    return sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAdminPassword(pwd: string): void {
  try {
    if (pwd) {
      sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, pwd);
    } else {
      sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function emitServerStatus(online: boolean): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('server-connection-status', { detail: { online } })
    );
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const adminPwd = getStoredAdminPassword();
  if (adminPwd && !headers.has('X-Admin-Password')) {
    headers.set('X-Admin-Password', adminPwd);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
    emitServerStatus(true);
  } catch {
    emitServerStatus(false);
    throw new Error(
      'Network error: Unable to reach the server. Check your connection or wait a moment if the server is restarting.'
    );
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      emitServerStatus(false);
      throw new Error(
        `Server is temporarily unavailable (HTTP ${response.status}). It may be restarting.`
      );
    }
    throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || `Request failed with HTTP ${response.status}`);
  }

  return json.data as T;
}
