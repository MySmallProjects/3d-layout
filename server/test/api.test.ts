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
  saveThumbnail
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

  console.log('✓ All integration tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
