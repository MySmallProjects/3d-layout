import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { VersionInfo } from '../../../shared/types';
import { PROJECT_ROOT } from '../config';

export const versionRouter = Router();

const versionFilePath = path.join(PROJECT_ROOT, 'version.json');

versionRouter.get('/', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(versionFilePath)) {
      const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8')) as VersionInfo;
      res.json({ success: true, data });
    } else {
      res.json({
        success: true,
        data: {
          version: '1.0.0',
          buildNumber: 0,
          buildDate: new Date().toISOString()
        }
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read version information';
    res.status(500).json({ success: false, error: message });
  }
});
