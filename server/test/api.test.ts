import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { DATA_DIR, MODELS_DIR, THUMBNAILS_DIR } from '../src/config';
import { initializeDatabase } from '../src/db/schema';
import {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder
} from '../src/services/folderService';
import {
  createModel,
  listModels,
  getModel,
  renameModel,
  moveModel,
  deleteModel,
  saveThumbnail,
  updateModelNormalisation
} from '../src/services/modelService';

async function runTests() {
  console.log('--- Running Phase 1 Backend Integration Tests ---');

  // 1. Initialize schema
  initializeDatabase();
  console.log('✓ Database initialized');

  // 2. Folder CRUD & Nesting
  const rootFolder = createFolder('Props');
  assert.strictEqual(rootFolder.name, 'Props');
  assert.strictEqual(rootFolder.parentId, null);
  console.log('✓ Created root folder');

  const subFolder = createFolder('Weapons', rootFolder.id);
  assert.strictEqual(subFolder.name, 'Weapons');
  assert.strictEqual(subFolder.parentId, rootFolder.id);
  console.log('✓ Created nested folder');

  const renamed = renameFolder(subFolder.id, 'Medieval Weapons');
  assert.strictEqual(renamed.name, 'Medieval Weapons');
  console.log('✓ Renamed folder');

  const folderListing = listFolders();
  assert(folderListing.folders.length >= 2);
  const rootNode = folderListing.tree.find((n) => n.id === rootFolder.id);
  assert(rootNode, 'Root folder node should be in tree');
  assert.strictEqual(rootNode.children.length, 1);
  assert.strictEqual(rootNode.children[0].id, subFolder.id);
  console.log('✓ Folder tree hierarchy and nesting verified');

  // 3. Model Creation & File Handling
  const tempDummyPath = path.join(DATA_DIR, 'temp-dummy.glb');
  fs.writeFileSync(tempDummyPath, 'glTF dummy binary content for test');

  const model = createModel('Sword Model.glb', subFolder.id, tempDummyPath, 34);
  assert.strictEqual(model.name, 'Sword Model'); // .glb stripped
  assert.strictEqual(model.folderId, subFolder.id);
  assert.strictEqual(model.sizeBytes, 34);

  const modelOnDisk = path.join(DATA_DIR, model.filePath);
  assert(fs.existsSync(modelOnDisk), 'Model file must exist in /data/models');
  console.log('✓ Model creation, renaming and disk persistence verified');

  // 4. Model Listing & Filtering
  const allModels = listModels();
  assert(allModels.some((m) => m.id === model.id));

  const filteredByFolder = listModels(subFolder.id);
  assert.strictEqual(filteredByFolder.length, 1);
  assert.strictEqual(filteredByFolder[0].id, model.id);

  const filteredBySearch = listModels(undefined, 'Sword');
  assert(filteredBySearch.some((m) => m.id === model.id));

  const filteredNoMatch = listModels(undefined, 'NonExistentXYZ');
  assert.strictEqual(filteredNoMatch.length, 0);
  console.log('✓ Model search and folder filtering verified');

  // 5. Model Move
  const moved = moveModel(model.id, null);
  assert.strictEqual(moved.folderId, null);
  const rootModels = listModels(null);
  assert(rootModels.some((m) => m.id === model.id));
  console.log('✓ Model moved between folders verified');

  // 6. Thumbnail Save & Serve
  const dummyPng = Buffer.from('fake-png-data');
  const thumbPath = saveThumbnail(model.id, dummyPng);
  assert(fs.existsSync(path.join(DATA_DIR, thumbPath)), 'Thumbnail file must exist');
  const updatedModel = getModel(model.id);
  assert.strictEqual(updatedModel?.thumbnailPath, thumbPath);
  console.log('✓ Model thumbnail saved and linked');

  // 7. Non-empty folder deletion safety
  const testParent = createFolder('SafetyTest');
  const testSub = createFolder('SubSafety', testParent.id);
  assert.throws(() => {
    deleteFolder(testParent.id, false); // should refuse unless deleteContents=true
  }, /not empty/i);
  console.log('✓ Non-empty folder deletion safely refused by default');

  deleteFolder(testParent.id, true); // recursive delete
  assert.strictEqual(listFolders().folders.find((f) => f.id === testParent.id), undefined);
  console.log('✓ Recursive folder deletion with deleteContents=true verified');

  // 8. Delete model cleanup (removes GLB and thumbnail from disk)
  deleteModel(model.id);
  assert(!fs.existsSync(modelOnDisk), 'Model file must be removed from disk on delete');
  assert(!fs.existsSync(path.join(DATA_DIR, thumbPath)), 'Thumbnail file must be removed on delete');
  assert.strictEqual(getModel(model.id), null, 'Model record deleted from DB');
  console.log('✓ Model deletion cleans up database and disk files');

  // Cleanup folders
  deleteFolder(rootFolder.id, true);

  // 9. Phase 2: Backgrounds Table & Operations
  console.log('--- Running Phase 2 Background Tests ---');
  const db = (await import('../src/db/connection')).getDatabase();
  const bgId = 'test-bg-123';
  const bgPath = 'backgrounds/test-bg-123.jpg';
  const fullBgPath = path.join(DATA_DIR, bgPath);
  fs.writeFileSync(fullBgPath, 'fake-jpeg-data');

  db.prepare(`
    INSERT INTO backgrounds (id, file_name, file_path, size_bytes, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(bgId, 'Studio Background.jpg', bgPath, 14, new Date().toISOString());

  const bgRow = db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(bgId) as any;
  assert(bgRow, 'Background row must exist');
  assert.strictEqual(bgRow.file_name, 'Studio Background.jpg');

  // Delete background
  if (fs.existsSync(fullBgPath)) fs.unlinkSync(fullBgPath);
  db.prepare('DELETE FROM backgrounds WHERE id = ?').run(bgId);
  assert.strictEqual(db.prepare('SELECT * FROM backgrounds WHERE id = ?').get(bgId), undefined);
  console.log('✓ Background database storage and cleanup verified');

  // 10. Phase 4: Scenes & Drafts
  console.log('--- Running Phase 4 Scene Tests ---');
  const {
    createScene,
    listScenes,
    getScene,
    updateScene,
    renameScene,
    duplicateScene,
    deleteScene,
    saveDraft,
    getDraft,
    clearDraft,
  } = await import('../src/services/sceneService');

  const sampleSceneData = {
    schemaVersion: 1,
    objects: [],
    gridVisible: true,
    background: { type: 'none' as const },
    camera: { position: [5, 5, 5] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
    lighting: {},
    renderSettings: {},
  };

  const createdScene = createScene('Test Room', sampleSceneData);
  assert(createdScene.id, 'Created scene must have an id');
  assert.strictEqual(createdScene.name, 'Test Room');
  assert(listScenes().some((s) => s.id === createdScene.id), 'Scene must appear in listScenes');

  const fetchedScene = getScene(createdScene.id);
  assert(fetchedScene && fetchedScene.data.schemaVersion === 1);

  const updatedScene = updateScene(createdScene.id, undefined, {
    ...sampleSceneData,
    gridVisible: false,
  });
  assert.strictEqual(updatedScene?.data.gridVisible, false);

  const renamedScene = renameScene(createdScene.id, 'Renamed Room');
  assert.strictEqual(renamedScene?.name, 'Renamed Room');

  const dupScene = duplicateScene(createdScene.id);
  assert(dupScene && dupScene.id !== createdScene.id);
  assert.strictEqual(dupScene.name, 'Copy of Renamed Room');

  saveDraft(createdScene.id, 'Renamed Room', sampleSceneData);
  const draft = getDraft();
  assert(draft && draft.sceneId === createdScene.id);
  clearDraft();
  assert.strictEqual(getDraft(), null);

  deleteScene(createdScene.id);
  deleteScene(dupScene.id);
  assert.strictEqual(getScene(createdScene.id), null);
  console.log('✓ Scene CRUD and draft lifecycle verified');

  // 11. Phase 5: Admin Backup, Reset, Restore Round-Trip & Malformed Zip Rejection
  console.log('--- Running Phase 5 Admin Tests ---');
  const os = await import('os');
  const archiverMod = (await (Function('return import("archiver")')())) as {
    ZipArchive: new () => import('archiver').Archiver;
  };
  const {
    getAdminOverview,
    createBackupArchive,
    resetAllData,
  } = await import('../src/services/adminService');
  const { validateBackupZip, confirmRestoreBackup } = await import('../src/services/restoreService');

  // Seed real data for backup round-trip
  const bFolder = createFolder('Backup Folder', null);
  const bTempPath = path.join(os.tmpdir(), `backup-test-${Date.now()}.glb`);
  fs.writeFileSync(bTempPath, 'glTF-backup-payload');
  const bModel = createModel('Backup Chair.glb', bFolder.id, bTempPath, 19);
  const bModelPath = bModel.filePath;
  saveThumbnail(bModel.id, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
  const bScene = createScene('Backup Scene', sampleSceneData, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');

  // Also seed Phase 7.1 app settings & per-model normalisation
  const { getAppSettings, updateAppSettings } = await import('../src/services/settingsService');
  updateAppSettings({ normalization: { enabledByDefault: false, defaultTargetSize: 3.5 } });
  updateModelNormalisation(bModel.id, {
    enabled: true,
    targetSize: 3.5,
    scaleFactor: 0.7,
    pivotOffset: [0.1, -0.5, -0.2],
    rawDimensions: [5, 2, 1],
  });

  // Also seed Phase 6 lighting preset, HDRI, and render to verify backups include them
  const { createCustomPreset, createHdri, listCustomPresets, listHdris, deleteCustomPreset, deleteHdri } = await import('../src/services/lightingService');
  const { createRender, listRenders, renameRender, deleteRender } = await import('../src/services/renderService');
  const bPreset = createCustomPreset('Warm Test Preset', {
    presetId: 'temp',
    presetName: 'Warm Test Preset',
    ambientIntensity: 0.5,
    ambientColor: '#ffffff',
    keyLight: { intensity: 2, color: '#fff', azimuthDeg: 45, elevationDeg: 45, castShadow: true },
    fillLight: { intensity: 1, color: '#fff', azimuthDeg: -45, elevationDeg: 30 },
    rimLight: { intensity: 1, color: '#fff', azimuthDeg: 180, elevationDeg: 40 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1,
  });
  const bHdriTemp = path.join(os.tmpdir(), `test-env-${Date.now()}.hdr`);
  fs.writeFileSync(bHdriTemp, '#?RADIANCE\n');
  const bHdri = createHdri('studio.hdr', bHdriTemp, 11);
  const bRender = createRender({
    name: 'Test Render 1',
    sceneId: bScene.id,
    sceneName: bScene.name,
    width: 1920,
    height: 1080,
    settings: {
      resolutionPreset: '1080p',
      width: 1920,
      height: 1080,
      samples: 2,
      fov: 45,
      dofEnabled: false,
      dofAperture: 0.002,
      dofFocusDistance: 8,
      transparentBg: false,
      exposure: 1,
      toneMapping: 'ACESFilmic',
      ssaoEnabled: true,
      groundPlaneEnabled: true,
      groundShadowOnly: true,
      groundColor: '#22252e',
      lighting: bPreset.config,
    },
    camera: sampleSceneData.camera,
    imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  });

  const overviewBefore = getAdminOverview();
  assert(overviewBefore.counts.models >= 1);
  assert(overviewBefore.counts.scenes >= 1);

  const backupZipPath = path.join(os.tmpdir(), `test-backup-${Date.now()}.zip`);
  await createBackupArchive(fs.createWriteStream(backupZipPath));
  assert(fs.existsSync(backupZipPath) && fs.statSync(backupZipPath).size > 0, 'Backup zip created');

  // Wipe via reset
  resetAllData('RESET');
  assert.strictEqual(getModel(bModel.id), null, 'Model must be wiped after reset');
  assert.strictEqual(getScene(bScene.id), null, 'Scene must be wiped after reset');
  assert(!fs.existsSync(path.join(DATA_DIR, bModelPath)), 'Model file must be deleted on reset');

  // Validate and restore
  const validation = await validateBackupZip(backupZipPath);
  assert.strictEqual(validation.manifest.counts.models, overviewBefore.counts.models);
  assert.strictEqual(validation.manifest.counts.scenes, overviewBefore.counts.scenes);
  await confirmRestoreBackup(validation.token);

  assert(getModel(bModel.id)?.name === 'Backup Chair', 'Model restored identically');
  assert.strictEqual(getModel(bModel.id)?.normalisation?.scaleFactor, 0.7, 'Model normalisation restored in backup');
  assert.strictEqual(getAppSettings().normalization.defaultTargetSize, 3.5, 'App settings restored in backup');
  assert.strictEqual(getAppSettings().normalization.enabledByDefault, false, 'App settings flag restored in backup');

  // Verify v1 -> v2 DB migration adds missing models.normalisation column
  const DatabaseMod = (await import('better-sqlite3')).default;
  const { migrateDatabase } = await import('../src/db/schema');
  const legacyDb = new DatabaseMod(':memory:');
  legacyDb.exec(`
    CREATE TABLE models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  migrateDatabase(legacyDb, 1);
  const migratedCols = legacyDb.prepare('PRAGMA table_info("models")').all() as { name: string }[];
  assert(migratedCols.some((c) => c.name === 'normalisation'), 'v1 -> v2 migration must add models.normalisation');
  legacyDb.close();
  console.log('✓ Phase 7.1 settings, per-model normalisation, backup/restore & v1->v2 migration verified');
  assert(getScene(bScene.id)?.name === 'Backup Scene', 'Scene restored identically');
  assert(
    fs.readFileSync(path.join(DATA_DIR, bModelPath), 'utf-8') === 'glTF-backup-payload',
    'Model file bytes restored identically'
  );
  console.log('✓ Backup -> Reset -> Restore round-trip verified');

  // Reject malformed zip (non-zip bytes)
  const badZipPath = path.join(os.tmpdir(), `bad-backup-${Date.now()}.zip`);
  fs.writeFileSync(badZipPath, 'not-a-zip-file');
  let rejectedMalformed = false;
  try {
    await validateBackupZip(badZipPath);
  } catch {
    rejectedMalformed = true;
  }
  assert(rejectedMalformed, 'Malformed zip must be rejected');
  if (fs.existsSync(badZipPath)) fs.unlinkSync(badZipPath);

  // Reject zip with path traversal
  const traversalZipPath = path.join(os.tmpdir(), `traversal-backup-${Date.now()}.zip`);
  await new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(traversalZipPath);
    const arc = new archiverMod.ZipArchive();
    out.on('close', () => resolve());
    arc.on('error', (err: Error) => reject(err));
    arc.pipe(out);
    arc.append('evil', { name: '../evil.txt' });
    arc.finalize();
  });
  let rejectedTraversal = false;
  try {
    await validateBackupZip(traversalZipPath);
  } catch {
    rejectedTraversal = true;
  }
  assert(rejectedTraversal, 'Path traversal zip must be rejected');
  if (fs.existsSync(traversalZipPath)) fs.unlinkSync(traversalZipPath);

  // Verify existing data untouched after rejected zips
  assert(getModel(bModel.id)?.name === 'Backup Chair', 'Existing data untouched after rejected zips');

  // Cleanup test data
  const renamedRender = renameRender(bRender.id, 'Renamed Render');
  assert.strictEqual(renamedRender.name, 'Renamed Render');
  assert(listCustomPresets().some((p) => p.id === bPreset.id), 'Lighting preset restored in backup');
  assert(listHdris().some((h) => h.id === bHdri.id), 'HDRI restored in backup');
  assert(listRenders('desc', bScene.id).some((r) => r.id === bRender.id), 'Render restored in backup');

  deleteRender(bRender.id);
  deleteHdri(bHdri.id);
  deleteCustomPreset(bPreset.id);
  deleteScene(bScene.id);
  deleteModel(bModel.id);
  deleteFolder(bFolder.id, true);
  console.log('✓ Malformed and path-traversal zip rejection verified');
  console.log('✓ Phase 6a/6c lighting presets, HDRIs, renders, and backup inclusion verified');

  // --- Phase 7.2: GLB optimisation, revert, settings & backup/restore tests ---
  const { Document, NodeIO } = await import('@gltf-transform/core');
  const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
  const { MeshoptDecoder } = await import('meshoptimizer');
  await MeshoptDecoder.ready;
  const sharp = (await import('sharp')).default;
  const { optimiseModelById, revertModelById } = await import('../src/services/modelOptimisationService');

  // Build a minimal valid textured GLB (128x128 patterned PNG + quad mesh so prune keeps the texture)
  const texPixels = Buffer.alloc(128 * 128 * 4);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (y * 128 + x) * 4;
      const checker = ((x >> 3) ^ (y >> 3)) & 1;
      texPixels[idx] = checker ? 220 : 40;
      texPixels[idx + 1] = (x * 2) & 255;
      texPixels[idx + 2] = (y * 2) & 255;
      texPixels[idx + 3] = 255;
    }
  }
  const pngBuf = await sharp(texPixels, {
    raw: { width: 128, height: 128, channels: 4 },
  })
    .png()
    .toBuffer();

  const doc = new Document();
  const buf = doc.createBuffer();
  const posAcc = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]))
    .setBuffer(buf);
  const uvAcc = doc
    .createAccessor()
    .setType('VEC2')
    .setArray(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]))
    .setBuffer(buf);
  const idxAcc = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint16Array([0, 1, 2, 0, 2, 3]))
    .setBuffer(buf);
  const tex = doc.createTexture('albedo').setMimeType('image/png').setImage(pngBuf);
  const mat = doc.createMaterial('mat').setBaseColorTexture(tex);
  const prim = doc
    .createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setIndices(idxAcc)
    .setMaterial(mat);
  const mesh = doc.createMesh('quad').addPrimitive(prim);
  const node = doc.createNode('quadNode').setMesh(mesh);
  doc.createScene('scene').addChild(node);

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
  });
  const rawGlbBytes = await io.writeBinary(doc);
  const rawGlbTemp = path.join(os.tmpdir(), `opt-test-${Date.now()}.glb`);
  fs.writeFileSync(rawGlbTemp, rawGlbBytes);

  const optModel = createModel('OptTest.glb', null, rawGlbTemp, rawGlbBytes.byteLength);
  updateAppSettings({ optimisation: { enabledOnUpload: true, maxTextureSize: 64, webpQuality: 75 } });

  const optimised = await optimiseModelById(optModel.id, { maxTextureSize: 64, webpQuality: 75 });
  assert.strictEqual(optimised.optimisation?.optimised, true, 'Model should be marked optimised');
  assert.strictEqual(optimised.optimisation?.originalSizeBytes, rawGlbBytes.byteLength);
  assert(optimised.optimisation?.originalFilePath, 'Original backup path must be recorded');
  const origAbs = path.join(DATA_DIR, optimised.optimisation!.originalFilePath);
  assert(fs.existsSync(origAbs), 'Original GLB backup must exist on disk');
  assert(Buffer.compare(fs.readFileSync(origAbs), Buffer.from(rawGlbBytes)) === 0, 'Original backup bytes match');

  // Verify optimised GLB reads back with WebP texture <= 64px
  const optDoc = await io.read(path.join(DATA_DIR, optimised.filePath));
  const outTex = optDoc.getRoot().listTextures()[0];
  assert.strictEqual(outTex.getMimeType(), 'image/webp', 'Texture must be converted to WebP');
  const outMeta = await sharp(Buffer.from(outTex.getImage()!)).metadata();
  assert((outMeta.width ?? 0) <= 64 && (outMeta.height ?? 0) <= 64, 'Texture resized to <= maxTextureSize');

  // Verify backup -> reset -> restore keeps both optimised GLB, original backup, and optimisation settings
  const optBackupZip = path.join(os.tmpdir(), `test-opt-backup-${Date.now()}.zip`);
  await createBackupArchive(fs.createWriteStream(optBackupZip));
  resetAllData('RESET');
  assert(!fs.existsSync(origAbs), 'Original backup wiped on reset');
  const optVal = await validateBackupZip(optBackupZip);
  await confirmRestoreBackup(optVal.token);
  if (fs.existsSync(optBackupZip)) fs.unlinkSync(optBackupZip);

  const restoredOpt = getModel(optModel.id);
  assert.strictEqual(restoredOpt?.optimisation?.optimised, true, 'Optimisation metadata restored');
  assert(fs.existsSync(origAbs), 'Original GLB backup restored from archive');
  assert.strictEqual(getAppSettings().optimisation.enabledOnUpload, true, 'Optimisation upload flag restored');
  assert.strictEqual(getAppSettings().optimisation.maxTextureSize, 64, 'Max texture setting restored');

  // Verify revert restores original bytes and removes backup file
  const reverted = await revertModelById(optModel.id);
  assert(!reverted.optimisation, 'Revert clears optimisation metadata');
  assert.strictEqual(reverted.sizeBytes, rawGlbBytes.byteLength, 'Revert restores original size');
  assert(!fs.existsSync(origAbs), 'Revert deletes backup original');
  assert(
    Buffer.compare(fs.readFileSync(path.join(DATA_DIR, reverted.filePath)), Buffer.from(rawGlbBytes)) === 0,
    'Reverted GLB bytes match original exactly'
  );
  deleteModel(optModel.id);

  // Verify v2 -> v3 migration adds models.optimisation
  const legacyV2Db = new DatabaseMod(':memory:');
  legacyV2Db.exec(`
    CREATE TABLE models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      normalisation TEXT
    );
  `);
  migrateDatabase(legacyV2Db, 2);
  const v3Cols = legacyV2Db.prepare('PRAGMA table_info("models")').all() as { name: string }[];
  assert(v3Cols.some((c) => c.name === 'optimisation'), 'v2 -> v3 migration must add models.optimisation');
  legacyV2Db.close();
  console.log('✓ Phase 7.2 GLB optimisation, WebP/Meshopt output, backup/restore, revert & v2->v3 migration verified');

  // Clean up isolated temp DATA_DIR if running in tmpdir
  if (DATA_DIR.startsWith(os.tmpdir())) {
    const { closeDatabase } = await import('../src/db/connection');
    closeDatabase();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }

  console.log('✓ All integration tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
