import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import {
  createRender,
  deleteRender,
  getRender,
  listRenders,
  renameRender,
} from '../services/renderService';

export const rendersRouter = Router();

rendersRouter.get('/', (req: Request, res: Response) => {
  try {
    const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
    const sceneId = typeof req.query.sceneId === 'string' && req.query.sceneId ? req.query.sceneId : undefined;
    res.json({ success: true, data: { renders: listRenders(sort, sceneId) } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list renders';
    res.status(500).json({ success: false, error: msg });
  }
});

rendersRouter.post('/', (req: Request, res: Response) => {
  try {
    const {
      name,
      sceneId,
      sceneName,
      cameraName,
      width,
      height,
      settings,
      camera,
      imageDataUrl,
      thumbnailDataUrl,
    } = req.body;

    if (!imageDataUrl || !settings || !camera || typeof width !== 'number' || typeof height !== 'number') {
      res.status(400).json({ success: false, error: 'Missing required render payload fields.' });
      return;
    }

    const record = createRender({
      name: name || `${sceneName || 'Scene'} Render`,
      sceneId: sceneId || null,
      sceneName: sceneName || 'Untitled Scene',
      cameraName: typeof cameraName === 'string' ? cameraName : null,
      width,
      height,
      settings,
      camera,
      imageDataUrl,
      thumbnailDataUrl,
    });
    res.status(201).json({ success: true, data: record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save render';
    res.status(400).json({ success: false, error: msg });
  }
});

rendersRouter.patch('/:id/rename', (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    const updated = renameRender(req.params.id, name || '');
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to rename render';
    res.status(400).json({ success: false, error: msg });
  }
});

rendersRouter.get('/:id/file', (req: Request, res: Response) => {
  try {
    const record = getRender(req.params.id);
    if (!record) {
      res.status(404).json({ success: false, error: 'Render not found' });
      return;
    }
    const fullPath = path.resolve(DATA_DIR, record.filePath);
    if (!fullPath.startsWith(DATA_DIR + path.sep) || !fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'Render image missing on disk' });
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to serve render image';
    res.status(500).json({ success: false, error: msg });
  }
});

rendersRouter.get('/:id/thumbnail', (req: Request, res: Response) => {
  try {
    const record = getRender(req.params.id);
    if (!record) {
      res.status(404).json({ success: false, error: 'Render not found' });
      return;
    }
    const fullPath = path.resolve(DATA_DIR, record.thumbnailPath);
    if (!fullPath.startsWith(DATA_DIR + path.sep) || !fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'Render thumbnail missing on disk' });
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to serve render thumbnail';
    res.status(500).json({ success: false, error: msg });
  }
});

rendersRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteRender(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete render';
    res.status(500).json({ success: false, error: msg });
  }
});
