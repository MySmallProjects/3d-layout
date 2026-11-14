import crypto from 'crypto';
import { getDatabase } from '../db/connection';
import { Folder, FolderNode } from '../../../shared/types';
import { sanitizeName } from '../utils/sanitize';
import { deleteModel } from './modelService';

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export function listFolders(): { folders: Folder[]; tree: FolderNode[] } {
  const db = getDatabase();
  const rows = db.prepare('SELECT id, name, parent_id, created_at FROM folders ORDER BY name ASC').all() as FolderRow[];

  const folders: Folder[] = rows.map(r => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    createdAt: r.created_at
  }));

  // Fetch model count per folder
  const countRows = db.prepare('SELECT folder_id, COUNT(*) as count FROM models GROUP BY folder_id').all() as {
    folder_id: string | null;
    count: number;
  }[];
  const countMap = new Map<string | null, number>();
  for (const c of countRows) {
    countMap.set(c.folder_id, c.count);
  }

  // Build tree
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, {
      ...f,
      children: [],
      modelCount: countMap.get(f.id) || 0
    });
  }

  const rootNodes: FolderNode[] = [];
  for (const f of folders) {
    const node = nodeMap.get(f.id)!;
    if (f.parentId && nodeMap.has(f.parentId)) {
      nodeMap.get(f.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  return { folders, tree: rootNodes };
}

export function createFolder(name: string, parentId: string | null = null): Folder {
  const db = getDatabase();
  const cleanName = sanitizeName(name);
  if (!cleanName) {
    throw new Error('Folder name cannot be empty');
  }

  if (parentId) {
    const parent = db.prepare('SELECT id FROM folders WHERE id = ?').get(parentId);
    if (!parent) {
      throw new Error(`Parent folder ${parentId} not found`);
    }
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare('INSERT INTO folders (id, name, parent_id, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    cleanName,
    parentId,
    createdAt
  );

  return { id, name: cleanName, parentId, createdAt };
}

export function renameFolder(id: string, name: string): Folder {
  const db = getDatabase();
  const cleanName = sanitizeName(name);
  if (!cleanName) {
    throw new Error('Folder name cannot be empty');
  }

  const folder = db.prepare('SELECT id, name, parent_id, created_at FROM folders WHERE id = ?').get(id) as FolderRow | undefined;
  if (!folder) {
    throw new Error(`Folder ${id} not found`);
  }

  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(cleanName, id);

  return {
    id: folder.id,
    name: cleanName,
    parentId: folder.parent_id,
    createdAt: folder.created_at
  };
}

export function deleteFolder(id: string, deleteContents = false): void {
  const db = getDatabase();
  const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(id);
  if (!folder) {
    throw new Error(`Folder ${id} not found`);
  }

  // Find all descendant folder IDs recursively
  const allSubfolderIds: string[] = [];
  const findDescendants = (parentId: string) => {
    const children = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(parentId) as { id: string }[];
    for (const child of children) {
      allSubfolderIds.push(child.id);
      findDescendants(child.id);
    }
  };
  findDescendants(id);

  const targetFolderIds = [id, ...allSubfolderIds];

  // Count models inside these folders
  const placeholders = targetFolderIds.map(() => '?').join(',');
  const containedModels = db.prepare(
    `SELECT id FROM models WHERE folder_id IN (${placeholders})`
  ).all(...targetFolderIds) as { id: string }[];

  if (!deleteContents && (containedModels.length > 0 || allSubfolderIds.length > 0)) {
    throw new Error('Folder is not empty. Move contents first or confirm deletion of all items.');
  }

  // Delete contained models (files + thumbnails + records)
  for (const m of containedModels) {
    deleteModel(m.id);
  }

  // Delete folders in reverse order (children first)
  const deleteStmt = db.prepare('DELETE FROM folders WHERE id = ?');
  for (const subId of allSubfolderIds.reverse()) {
    deleteStmt.run(subId);
  }
  deleteStmt.run(id);
}
