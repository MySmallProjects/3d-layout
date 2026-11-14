import fs from 'fs';
import path from 'path';
import { ensureDirectories, SETTINGS_DIR } from '../config';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../../../shared/types';

const SETTINGS_FILE = path.join(SETTINGS_DIR, 'app-settings.json');

function sanitizeSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  const norm = raw?.normalization;
  const targetSize =
    typeof norm?.defaultTargetSize === 'number' && Number.isFinite(norm.defaultTargetSize) && norm.defaultTargetSize > 0
      ? Math.min(1000, Math.max(0.01, norm.defaultTargetSize))
      : DEFAULT_APP_SETTINGS.normalization.defaultTargetSize;

  return {
    normalization: {
      enabledByDefault:
        typeof norm?.enabledByDefault === 'boolean'
          ? norm.enabledByDefault
          : DEFAULT_APP_SETTINGS.normalization.enabledByDefault,
      defaultTargetSize: targetSize,
    },
  };
}

export function getAppSettings(): AppSettings {
  ensureDirectories();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return structuredClone(DEFAULT_APP_SETTINGS);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')) as Partial<AppSettings>;
    return sanitizeSettings(raw);
  } catch {
    return structuredClone(DEFAULT_APP_SETTINGS);
  }
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const merged: AppSettings = sanitizeSettings({
    normalization: {
      ...current.normalization,
      ...(patch.normalization || {}),
    },
  });

  ensureDirectories();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
