#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'version.json');

try {
  let versionData = {
    version: '1.0.0',
    buildNumber: 0,
    buildDate: new Date().toISOString()
  };

  if (fs.existsSync(versionFilePath)) {
    const raw = fs.readFileSync(versionFilePath, 'utf-8');
    versionData = JSON.parse(raw);
  }

  versionData.buildNumber = (versionData.buildNumber || 0) + 1;
  versionData.buildDate = new Date().toISOString();

  fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n', 'utf-8');
  console.log(`[version] Updated version.json -> v${versionData.version}.${versionData.buildNumber} (${versionData.buildDate})`);
} catch (err) {
  console.error('[version] Failed to update version.json:', err);
  process.exit(1);
}
