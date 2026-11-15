import * as THREE from 'three';
import type { SceneObject } from '@shared/types/scene';
import { getDescendantIds } from './sceneHierarchy';

/**
 * Collects all meshes in the scene belonging to `scene_obj_*` roots,
 * excluding any object in `ignoreIds` (and all of their descendants).
 */
export function collectSurfaceTargetMeshes(
  scene: THREE.Scene,
  objects: SceneObject[],
  ignoreIds: string[]
): THREE.Mesh[] {
  const excluded = new Set<string>(ignoreIds);
  for (const id of ignoreIds) {
    for (const descId of getDescendantIds(id, objects)) {
      excluded.add(descId);
    }
  }

  const meshes: THREE.Mesh[] = [];
  for (const obj of objects) {
    if (excluded.has(obj.id) || obj.isGroup || !obj.visible) continue;
    const obj3d = scene.getObjectByName(`scene_obj_${obj.id}`);
    if (!obj3d) continue;
    obj3d.updateWorldMatrix(true, true);
    obj3d.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
  }
  return meshes;
}

/**
 * Computes the world-space bounding box of a `scene_obj_*` node (meshes only).
 */
export function getObjectWorldMeshBox(obj3d: THREE.Object3D): THREE.Box3 {
  obj3d.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  obj3d.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      box.expandByObject(child);
    }
  });
  return box;
}

/**
 * Raycasts downward from `(x, startY, z)` against `targetMeshes` and the `y = 0` floor plane,
 * returning the highest surface Y at or below `startY`.
 */
export function findSurfaceYBelow(
  x: number,
  startY: number,
  z: number,
  targetMeshes: THREE.Mesh[]
): number {
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, startY, z),
    new THREE.Vector3(0, -1, 0),
    0,
    500
  );

  let bestY = startY >= 0 ? 0 : -Infinity;

  if (targetMeshes.length > 0) {
    const hits = raycaster.intersectObjects(targetMeshes, false);
    for (const hit of hits) {
      if (hit.point.y <= startY + 1e-4 && hit.point.y > bestY) {
        bestY = hit.point.y;
        break; // hits are sorted closest first (highest Y first for downward ray)
      }
    }
  }

  if (bestY === -Infinity) {
    bestY = 0;
  }
  return bestY;
}

/**
 * Computes the world-space deltaY needed so `obj3d` rests on the surface directly below it.
 * `rayStartAboveMinY` controls how far above `box.min.y` the downward ray starts:
 * small for explicit "drop below" (avoids hitting overhanging shelves/ceilings),
 * slightly larger during interactive horizontal move so objects can step onto surfaces.
 */
export function computeDropDeltaY(
  obj3d: THREE.Object3D,
  targetMeshes: THREE.Mesh[],
  rayStartAboveMinY = 0.08
): number | null {
  const box = getObjectWorldMeshBox(obj3d);
  if (box.isEmpty()) return null;

  const center = new THREE.Vector3();
  box.getCenter(center);
  const height = Math.max(0.05, box.max.y - box.min.y);
  const startY = box.min.y + Math.min(height, rayStartAboveMinY);

  const surfaceY = findSurfaceYBelow(center.x, startY, center.z, targetMeshes);
  return surfaceY - box.min.y;
}
