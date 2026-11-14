import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { BACKGROUNDS_DIR, DATA_DIR } from '../config';
import { getDatabase } from '../db/connection';
import { BackgroundItem } from '../../../shared/types';
import { sanitizeName } from '../utils/sanitize';

export const backgroundsRouter = Router();

// Configure multer for background uploads
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for background images / HDRIs
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.hdr', '.exr'];
    if (!allowed.includes(ext)) {
      return cb(new Error('Invalid image type. Allowed: JPG, PNG, WebP, HDR.'));
    }
    cb(null, true);
  }
});

interface BackgroundRow {
  id: string;
  file_name: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
}

function rowToItem(row: BackgroundRow): BackgroundItem {
  return {
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at
  };
}

// GET /api/backgrounds - list backgrounds
backgroundsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM backgrounds ORDER BY created_at DESC').all() as BackgroundRow[];
    res.json({ success: true, data: { backgrounds: rows.map(rowToItem) } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list backgrounds';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/backgrounds/upload - upload background
backgroundsRouter.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file provided' });
      return;
    }

    const db = getDatabase();
    const id = crypto.randomUUID();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const cleanOriginalName = sanitizeName(req.file.originalname);
    const storedFileName = `${id}${ext}`;
    const destinationPath = path.join(BACKGROUNDS_DIR, storedFileName);
    const relativeFilePath = path.join('backgrounds', storedFileName);

    fs.writeFileSync(destinationPath, req.file.buffer);

    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO backgrounds (id, file_name, file_path, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, cleanOriginalName, relativeFilePath, req.file.size, createdAt);

    res.status(201).json({
      success: true,
      data: {
        id,
        fileName: cleanOriginalName,
        filePath: relativeFilePath,
        sizeBytes: req.file.size,
        createdAt
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload background';
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/backgrounds/:id/file - serve background image
backgroundsRouter.get('/:id/file', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(req.params.id) as BackgroundRow | undefined;
    if (!row) {
      res.status(404).json({ success: false, error: 'Background not found' });
      return;
    }

    const fullPath = path.join(DATA_DIR, row.file_path);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'File missing on disk' });
      return;
    }

    res.sendFile(fullPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve background';
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/backgrounds/:id - delete background
backgroundsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(req.params.id) as BackgroundRow | undefined;
    if (row) {
      const fullPath = path.join(DATA_DIR, row.file_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.error('Failed to unlink background file:', e);
        }
      }
      db.prepare('DELETE FROM backgrounds WHERE id = ?').run(req.params.id);
    }
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete background';
    res.status(400).json({ success: false, error: message });
  }
});
