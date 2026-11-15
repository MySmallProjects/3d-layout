import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  listModels,
  getModel,
  createModel,
  renameModel,
  moveModel,
  deleteModel,
  saveThumbnail,
  updateModelNormalisation,
  updateModelTags,
  touchModelUsed,
  validateGlbBinaryFile
} from '../services/modelService';
import { optimiseModelById, revertModelById } from '../services/modelOptimisationService';
import { getAppSettings } from '../services/settingsService';
import { DATA_DIR, MAX_FILE_SIZE_BYTES } from '../config';

export const modelsRouter = Router();

// Configure multer for GLB uploads
const tempUploadDir = path.join(DATA_DIR, 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.glb') {
      return cb(new Error('Invalid file type. Only .glb files are supported.'));
    }
    cb(null, true);
  }
});

// Multer for thumbnail uploads
const thumbnailUpload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB thumbnail max
});

// GET /api/models - list models
modelsRouter.get('/', (req: Request, res: Response) => {
  try {
    const folderId = req.query.folderId !== undefined ? (req.query.folderId as string) : undefined;
    const search = req.query.search ? (req.query.search as string) : undefined;
    const models = listModels(folderId, search);
    res.json({ success: true, data: { models } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list models';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/models/:id - get single model
modelsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const model = getModel(req.params.id);
    if (!model) {
      res.status(404).json({ success: false, error: 'Model not found' });
      return;
    }
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get model';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/models/upload - multipart upload (single or multiple)
modelsRouter.post('/upload', (req: Request, res: Response) => {
  const uploadHandler = upload.array('files');

  uploadHandler(req, res, async (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const mb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
        res.status(400).json({
          success: false,
          error: `File size exceeds the limit of ${mb}MB.`
        });
        return;
      }
      res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      return;
    } else if (err instanceof Error) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files were uploaded' });
      return;
    }

    const folderId = req.body.folderId || null;
    const createdModels = [];
    const optSettings = getAppSettings().optimisation;

    try {
      for (const file of files) {
        const validation = validateGlbBinaryFile(file.path);
        if (!validation.valid) {
          for (const f of files) {
            if (fs.existsSync(f.path)) {
              try {
                fs.unlinkSync(f.path);
              } catch {
                // ignore unlink error
              }
            }
          }
          res.status(400).json({
            success: false,
            error: `Corrupt or invalid GLB file "${file.originalname}": ${validation.error}`,
          });
          return;
        }
      }

      for (const file of files) {
        let model = createModel(file.originalname, folderId, file.path, file.size);
        if (optSettings.enabledOnUpload) {
          try {
            model = await optimiseModelById(model.id, {
              maxTextureSize: optSettings.maxTextureSize,
              webpQuality: optSettings.webpQuality,
            });
          } catch (optErr) {
            console.warn(`Auto-optimisation skipped for "${model.name}":`, optErr);
          }
        }
        createdModels.push(model);
      }
      res.status(201).json({ success: true, data: { models: createdModels } });
    } catch (saveErr: unknown) {
      const message = saveErr instanceof Error ? saveErr.message : 'Failed to save model files';
      res.status(500).json({ success: false, error: message });
    }
  });
});

// PATCH /api/models/:id/rename
modelsRouter.patch('/:id/rename', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Model name is required' });
      return;
    }
    const model = renameModel(req.params.id, name);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rename model';
    res.status(400).json({ success: false, error: message });
  }
});

// PATCH /api/models/:id/move
modelsRouter.patch('/:id/move', (req: Request, res: Response) => {
  try {
    const folderId = req.body.folderId === undefined ? null : req.body.folderId;
    const model = moveModel(req.params.id, folderId);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to move model';
    res.status(400).json({ success: false, error: message });
  }
});

// PATCH /api/models/:id/normalisation
modelsRouter.patch('/:id/normalisation', (req: Request, res: Response) => {
  try {
    const normalisation = req.body.normalisation === undefined ? null : req.body.normalisation;
    const model = updateModelNormalisation(req.params.id, normalisation);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update model normalisation';
    res.status(400).json({ success: false, error: message });
  }
});

// PATCH /api/models/:id/tags
modelsRouter.patch('/:id/tags', (req: Request, res: Response) => {
  try {
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const model = updateModelTags(req.params.id, tags);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update model tags';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/models/:id/used
modelsRouter.post('/:id/used', (req: Request, res: Response) => {
  try {
    const model = touchModelUsed(req.params.id);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record model usage';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/models/:id/optimise
modelsRouter.post('/:id/optimise', async (req: Request, res: Response) => {
  try {
    const { maxTextureSize, webpQuality } = (req.body || {}) as {
      maxTextureSize?: number;
      webpQuality?: number;
    };
    const model = await optimiseModelById(req.params.id, { maxTextureSize, webpQuality });
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to optimise GLB model';
    res.status(400).json({ success: false, error: message });
  }
});

// POST /api/models/:id/revert
modelsRouter.post('/:id/revert', (req: Request, res: Response) => {
  try {
    const model = revertModelById(req.params.id);
    res.json({ success: true, data: model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to revert model to original';
    res.status(400).json({ success: false, error: message });
  }
});

// DELETE /api/models/:id
modelsRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteModel(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete model';
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/models/:id/file - serve GLB binary
modelsRouter.get('/:id/file', (req: Request, res: Response) => {
  try {
    const model = getModel(req.params.id);
    if (!model) {
      res.status(404).json({ success: false, error: 'Model not found' });
      return;
    }

    const fullPath = path.join(DATA_DIR, model.filePath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'Model file missing on disk' });
      return;
    }

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Disposition', `inline; filename="${model.name}.glb"`);
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve model file';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/models/:id/thumbnail - upload PNG thumbnail
modelsRouter.post('/:id/thumbnail', thumbnailUpload.single('thumbnail'), (req: Request, res: Response) => {
  try {
    let buffer: Buffer;

    if (req.file) {
      buffer = req.file.buffer;
    } else if (req.body && typeof req.body.dataUrl === 'string') {
      // Allow data:image/png;base64,... string
      const base64Data = req.body.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      res.status(400).json({ success: false, error: 'No thumbnail image provided' });
      return;
    }

    const relativePath = saveThumbnail(req.params.id, buffer);
    res.json({ success: true, data: { thumbnailPath: relativePath } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save thumbnail';
    res.status(400).json({ success: false, error: message });
  }
});

// GET /api/models/:id/thumbnail - serve PNG thumbnail
modelsRouter.get('/:id/thumbnail', (req: Request, res: Response) => {
  try {
    const model = getModel(req.params.id);
    if (!model || !model.thumbnailPath) {
      res.status(404).json({ success: false, error: 'Thumbnail not found' });
      return;
    }

    const fullPath = path.join(DATA_DIR, model.thumbnailPath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: 'Thumbnail file missing on disk' });
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.sendFile(fullPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to serve thumbnail';
    res.status(500).json({ success: false, error: message });
  }
});
