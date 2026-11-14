import { Router, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import type { LightingConfig } from '../../../shared/types/lighting';
import { DATA_DIR, MAX_FILE_SIZE_BYTES } from '../config';
import {
  createCustomPreset,
  createHdri,
  deleteCustomPreset,
  deleteHdri,
  getHdri,
  listCustomPresets,
  listHdris,
} from '../services/lightingService';

export const lightingRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

lightingRouter.get('/presets', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: { presets: listCustomPresets() } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list lighting presets';
    res.status(500).json({ success: false, error: msg });
  }
});

lightingRouter.post('/presets', (req: Request, res: Response) => {
  try {
    const { name, config } = req.body as { name?: string; config?: LightingConfig };
    if (!name || !config) {
      res.status(400).json({ success: false, error: 'Preset name and config are required.' });
      return;
    }
    const preset = createCustomPreset(name, config);
    res.status(201).json({ success: true, data: preset });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create preset';
    res.status(400).json({ success: false, error: msg });
  }
});

lightingRouter.delete('/presets/:id', (req: Request, res: Response) => {
  try {
    deleteCustomPreset(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete preset';
    res.status(500).json({ success: false, error: msg });
  }
});

lightingRouter.get('/hdris', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: { hdris: listHdris() } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list HDRIs';
    res.status(500).json({ success: false, error: msg });
  }
});

lightingRouter.post('/hdris', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'HDRI file (.hdr or .exr) is required.' });
    return;
  }
  try {
    const hdri = createHdri(req.file.originalname, req.file.path, req.file.size);
    res.status(201).json({ success: true, data: hdri });
  } catch (err: unknown) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const msg = err instanceof Error ? err.message : 'Failed to upload HDRI';
    res.status(400).json({ success: false, error: msg });
  }
});

lightingRouter.get('/hdris/:id/file', (req: Request, res: Response) => {
  try {
    const hdri = getHdri(req.params.id);
    if (!hdri) {
      res.status(404).json({ success: false, error: 'HDRI not found' });
      return;
    }
    const fullPath = path.resolve(DATA_DIR, hdri.filePath);
    if (!fullPath.startsWith(DATA_DIR + path.sep) || !fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'HDRI file missing on disk' });
      return;
    }
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to serve HDRI';
    res.status(500).json({ success: false, error: msg });
  }
});

lightingRouter.delete('/hdris/:id', (req: Request, res: Response) => {
  try {
    deleteHdri(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete HDRI';
    res.status(500).json({ success: false, error: msg });
  }
});
