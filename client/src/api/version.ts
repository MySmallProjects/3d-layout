import { apiRequest } from './client';
import { VersionInfo } from '../types';

export async function fetchVersion(): Promise<VersionInfo> {
  return apiRequest<VersionInfo>('/api/version');
}
