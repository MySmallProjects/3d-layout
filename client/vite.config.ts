import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

let versionData = {
  version: '1.0.0',
  buildNumber: 1,
  buildDate: new Date().toISOString()
};

try {
  const versionFilePath = path.resolve(__dirname, '../version.json');
  if (fs.existsSync(versionFilePath)) {
    versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not read version.json', e);
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(versionData.version),
    __BUILD_NUMBER__: JSON.stringify(versionData.buildNumber),
    __BUILD_DATE__: JSON.stringify(versionData.buildDate)
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
