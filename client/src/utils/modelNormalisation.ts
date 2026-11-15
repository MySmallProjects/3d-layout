import * as THREE from 'three';
import type { ModelNormalisation } from '@shared/types/model';
import type { AppliedNormalisation } from '@shared/types/scene';
import { createConfiguredGLTFLoader } from '../services/gltfLoader';

function roundVal(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Computes centre-bottom pivot offset and uniform scale factor so the largest
 * dimension matches `targetSize`.
 */
export function computeNormalisationFromObject(
  root: THREE.Object3D,
  targetSize: number,
  enabled = true
): ModelNormalisation {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) {
    return {
      enabled,
      targetSize,
      scaleFactor: 1,
      pivotOffset: [0, 0, 0],
      rawDimensions: [0, 0, 0],
    };
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scaleFactor = maxDim > 1e-6 ? roundVal(targetSize / maxDim) : 1;

  return {
    enabled,
    targetSize,
    scaleFactor,
    pivotOffset: [roundVal(-center.x), roundVal(-box.min.y), roundVal(-center.z)],
    rawDimensions: [roundVal(size.x), roundVal(size.y), roundVal(size.z)],
  };
}

function disposeObjectSubtree(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        for (const val of Object.values(mat)) {
          if (val && typeof val === 'object' && 'isTexture' in val && (val as THREE.Texture).isTexture) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}

export async function computeModelNormalisationFromUrl(
  modelUrl: string,
  targetSize: number,
  enabled = true
): Promise<ModelNormalisation> {
  const loader = await createConfiguredGLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  try {
    return computeNormalisationFromObject(gltf.scene, targetSize, enabled);
  } finally {
    disposeObjectSubtree(gltf.scene);
  }
}

export function toAppliedNormalisation(
  norm?: ModelNormalisation | null
): AppliedNormalisation | null {
  if (!norm || !norm.enabled) return null;
  return {
    scaleFactor: norm.scaleFactor,
    pivotOffset: [norm.pivotOffset[0], norm.pivotOffset[1], norm.pivotOffset[2]],
  };
}

/**
 * Wraps a cloned GLTF root group inside an outer instance group so callers can
 * freely set `wrapped.position / rotation / scale` on the outer group without
 * overwriting the inner `scaleFactor` or `pivotOffset` normalisation groups.
 * Matches the viewport's `<group position/rotation/scale><group scale><group position>` hierarchy.
 */
export function wrapWithAppliedNormalisation(
  clone: THREE.Group,
  applied?: AppliedNormalisation | null
): THREE.Group {
  const instanceGroup = new THREE.Group();
  if (!applied) {
    instanceGroup.add(clone);
    return instanceGroup;
  }

  const scaleGroup = new THREE.Group();
  scaleGroup.scale.setScalar(applied.scaleFactor);

  const pivotGroup = new THREE.Group();
  pivotGroup.position.set(...applied.pivotOffset);
  pivotGroup.add(clone);

  scaleGroup.add(pivotGroup);
  instanceGroup.add(scaleGroup);
  return instanceGroup;
}
