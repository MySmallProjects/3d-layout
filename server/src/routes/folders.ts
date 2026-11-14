import { Router, Request, Response } from 'express';
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder
} from '../services/folderService';

export const foldersRouter = Router();

foldersRouter.get('/', (_req: Request, res: Response) => {
  try {
    const data = listFolders();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list folders';
    res.status(500).json({ success: false, error: message });
  }
});

foldersRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Folder name is required' });
      return;
    }
    const folder = createFolder(name, parentId || null);
    res.status(201).json({ success: true, data: folder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create folder';
    res.status(400).json({ success: false, error: message });
  }
});

foldersRouter.patch('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'New folder name is required' });
      return;
    }
    const folder = renameFolder(id, name);
    res.json({ success: true, data: folder });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rename folder';
    res.status(400).json({ success: false, error: message });
  }
});

foldersRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteContents = req.query.deleteContents === 'true';
    deleteFolder(id, deleteContents);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete folder';
    res.status(400).json({ success: false, error: message });
  }
});
