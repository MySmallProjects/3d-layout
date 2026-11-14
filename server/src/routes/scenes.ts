import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import {
  listScenes,
  getScene,
  createScene,
  updateScene,
  renameScene,
  duplicateScene,
  deleteScene,
  getDraft,
  saveDraft,
  clearDraft
} from '../services/sceneService';

export const scenesRouter = Router();

// --- Draft Routes (must come before /:id) ---

scenesRouter.get('/draft/current', (_req: Request, res: Response) => {
  try {
    const draft = getDraft();
    res.json({ success: true, data: { draft } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load draft';
    res.status(500).json({ success: false, error: msg });
  }
});

scenesRouter.put('/draft/current', (req: Request, res: Response) => {
  try {
    const { sceneId, sceneName, data } = req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Scene data is required' });
      return;
    }
    const draft = saveDraft(sceneId || null, sceneName || 'Untitled Scene', data);
    res.json({ success: true, data: { draft } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save draft';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.delete('/draft/current', (_req: Request, res: Response) => {
  try {
    clearDraft();
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to clear draft';
    res.status(500).json({ success: false, error: msg });
  }
});

// --- Scene CRUD Routes ---

scenesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const scenes = listScenes();
    res.json({ success: true, data: { scenes } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to list scenes';
    res.status(500).json({ success: false, error: msg });
  }
});

scenesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const scene = getScene(req.params.id);
    if (!scene) {
      res.status(404).json({ success: false, error: 'Scene not found' });
      return;
    }
    res.json({ success: true, data: scene });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to get scene';
    res.status(500).json({ success: false, error: msg });
  }
});

scenesRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, data, thumbnailDataUrl } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Scene name is required' });
      return;
    }
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Scene data is required' });
      return;
    }
    const scene = createScene(name, data, thumbnailDataUrl);
    res.status(201).json({ success: true, data: scene });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create scene';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, data, thumbnailDataUrl } = req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Scene data is required' });
      return;
    }
    const scene = updateScene(req.params.id, name, data, thumbnailDataUrl);
    res.json({ success: true, data: scene });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update scene';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.patch('/:id/rename', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Scene name is required' });
      return;
    }
    const scene = renameScene(req.params.id, name);
    res.json({ success: true, data: scene });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to rename scene';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.post('/:id/duplicate', (req: Request, res: Response) => {
  try {
    const scene = duplicateScene(req.params.id);
    res.status(201).json({ success: true, data: scene });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to duplicate scene';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteScene(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete scene';
    res.status(400).json({ success: false, error: msg });
  }
});

scenesRouter.get('/:id/thumbnail', (req: Request, res: Response) => {
  try {
    const scene = getScene(req.params.id);
    if (!scene || !scene.thumbnailPath) {
      res.status(404).json({ success: false, error: 'Scene thumbnail not found' });
      return;
    }
    const fullPath = path.join(DATA_DIR, scene.thumbnailPath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'Thumbnail missing on disk' });
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to serve thumbnail';
    res.status(500).json({ success: false, error: msg });
  }
});
