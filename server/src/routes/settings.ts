import { Router, Request, Response } from 'express';
import { getAppSettings, updateAppSettings } from '../services/settingsService';
import type { AppSettings } from '../../../shared/types';

export const settingsRouter = Router();

settingsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getAppSettings();
    res.json({ success: true, data: settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load settings';
    res.status(500).json({ success: false, error: message });
  }
});

settingsRouter.put('/', (req: Request, res: Response) => {
  try {
    const patch = (req.body || {}) as Partial<AppSettings>;
    const updated = updateAppSettings(patch);
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    res.status(400).json({ success: false, error: message });
  }
});
