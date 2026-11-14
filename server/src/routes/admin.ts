import { Router, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import {
  buildBackupFilename,
  createBackupArchive,
  getAdminOverview,
  resetAllData,
} from '../services/adminService';
import {
  confirmRestoreBackup,
  discardRestoreToken,
  validateBackupZip,
} from '../services/restoreService';

export const adminRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: parseInt(process.env.MAX_BACKUP_SIZE_BYTES || String(5 * 1024 * 1024 * 1024), 10),
  },
});

adminRouter.get('/overview', (_req: Request, res: Response) => {
  try {
    const overview = getAdminOverview();
    res.json({ success: true, data: overview });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load admin overview';
    res.status(500).json({ success: false, error: msg });
  }
});

adminRouter.get('/backup', async (_req: Request, res: Response) => {
  try {
    const filename = buildBackupFilename();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await createBackupArchive(res);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create backup';
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: msg });
    } else {
      res.end();
    }
  }
});

adminRouter.post('/restore/validate', upload.single('backup'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'Backup zip file is required.' });
    return;
  }

  try {
    const result = await validateBackupZip(req.file.path);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    if (fs.existsSync(req.file.path)) {
      fs.rmSync(req.file.path, { force: true });
    }
    const msg = err instanceof Error ? err.message : 'Backup validation failed';
    res.status(400).json({ success: false, error: msg });
  }
});

adminRouter.post('/restore/confirm', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, error: 'Restore validation token is required.' });
    return;
  }

  try {
    await confirmRestoreBackup(token);
    res.json({ success: true, data: { restored: true } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Restore failed';
    res.status(400).json({ success: false, error: msg });
  }
});

adminRouter.delete('/restore/:token', (req: Request, res: Response) => {
  discardRestoreToken(req.params.token);
  res.json({ success: true });
});

adminRouter.post('/reset', (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body as { confirmation?: string };
    resetAllData(confirmation || '');
    res.json({ success: true, data: { reset: true } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Reset failed';
    res.status(400).json({ success: false, error: msg });
  }
});
