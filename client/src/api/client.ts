import { ApiResponse } from '../types';

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Server returned HTTP ${response.status} (${response.statusText})`);
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || `Request failed with HTTP ${response.status}`);
  }

  return json.data as T;
}
