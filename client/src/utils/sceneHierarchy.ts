import * as THREE from 'three';
import type { SceneObject } from '@shared/types/scene';

export function composeLocalMatrix(obj: SceneObject): THREE.Matrix4 {
  const pos = new THREE.Vector3(...obj.position);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation));
  const scl = new THREE.Vector3(...obj.scale);
  return new THREE.Matrix4().compose(pos, quat, scl);
}

export function getParentWorldMatrix(
  parentId: string | null,
  objects: SceneObject[]
): THREE.Matrix4 {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const chain: SceneObject[] = [];
  const visited = new Set<string>();
  let currId = parentId;

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    const node = byId.get(currId);
    if (!node) break;
    chain.push(node);
    currId = node.parentId;
  }

  const world = new THREE.Matrix4();
  for (let i = chain.length - 1; i >= 0; i--) {
    world.multiply(composeLocalMatrix(chain[i]));
  }
  return world;
}

export function getWorldMatrix(obj: SceneObject, objects: SceneObject[]): THREE.Matrix4 {
  return getParentWorldMatrix(obj.parentId, objects).multiply(composeLocalMatrix(obj));
}

export function decomposeMatrixToTransform(matrix: THREE.Matrix4): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  matrix.decompose(pos, quat, scl);
  const euler = new THREE.Euler().setFromQuaternion(quat);
  return {
    position: [pos.x, pos.y, pos.z],
    rotation: [euler.x, euler.y, euler.z],
    scale: [scl.x, scl.y, scl.z],
  };
}

export function getDescendantIds(rootId: string, objects: SceneObject[]): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const o of objects) {
      if (o.parentId === curr && !result.has(o.id)) {
        result.add(o.id);
        queue.push(o.id);
      }
    }
  }
  return result;
}

export function filterTopLevelSelected(
  selectedIds: string[],
  objects: SceneObject[]
): SceneObject[] {
  const selectedSet = new Set(selectedIds);
  const byId = new Map(objects.map((o) => [o.id, o]));

  const hasSelectedAncestor = (obj: SceneObject): boolean => {
    const visited = new Set<string>();
    let pid = obj.parentId;
    while (pid && !visited.has(pid)) {
      if (selectedSet.has(pid)) return true;
      visited.add(pid);
      pid = byId.get(pid)?.parentId ?? null;
    }
    return false;
  };

  return objects.filter((o) => selectedSet.has(o.id) && !o.locked && !hasSelectedAncestor(o));
}

export function isEffectivelyVisible(obj: SceneObject, objects: SceneObject[]): boolean {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const visited = new Set<string>();
  let curr: SceneObject | undefined = obj;
  while (curr && !visited.has(curr.id)) {
    if (!curr.visible) return false;
    visited.add(curr.id);
    curr = curr.parentId ? byId.get(curr.parentId) : undefined;
  }
  return true;
}
