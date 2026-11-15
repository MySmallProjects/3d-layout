import * as THREE from 'three';
import type { MaterialOverride } from '@shared/types/scene';

/**
 * Applies per-object material overrides (colour, roughness, metalness) and/or
 * DoubleSide winding (for negative-determinant mirrored scales) to a cloned
 * GLTF hierarchy by cloning only the materials that need modification.
 * Returns the list of newly cloned materials so callers can dispose them on cleanup.
 */
export function applyInstanceMaterialState(
  root: THREE.Object3D,
  baseRoot: THREE.Object3D,
  isNegativeDet: boolean,
  override?: MaterialOverride | null
): THREE.Material[] {
  const clonedMaterials: THREE.Material[] = [];
  const hasOverride = Boolean(
    override &&
      override.enabled &&
      (override.color !== undefined ||
        override.roughness !== undefined ||
        override.metalness !== undefined)
  );

  // Collect original materials from baseRoot in traversal order
  const baseMeshes: THREE.Mesh[] = [];
  baseRoot.traverse((c) => {
    if (c instanceof THREE.Mesh) baseMeshes.push(c);
  });

  let idx = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const baseMesh = baseMeshes[idx++];
    const origMat = baseMesh ? baseMesh.material : child.material;

    if (!isNegativeDet && !hasOverride) {
      child.material = origMat;
      return;
    }

    const applyToSingle = (m: THREE.Material): THREE.Material => {
      const cloned = m.clone();
      cloned.side = isNegativeDet ? THREE.DoubleSide : m.side;
      if (hasOverride && override) {
        const std = cloned as THREE.MeshStandardMaterial;
        if (override.color && std.color instanceof THREE.Color) {
          std.color.set(override.color);
        }
        if (typeof override.roughness === 'number' && 'roughness' in std) {
          std.roughness = Math.max(0, Math.min(1, override.roughness));
        }
        if (typeof override.metalness === 'number' && 'metalness' in std) {
          std.metalness = Math.max(0, Math.min(1, override.metalness));
        }
      }
      cloned.needsUpdate = true;
      clonedMaterials.push(cloned);
      return cloned;
    };

    if (Array.isArray(origMat)) {
      child.material = origMat.map(applyToSingle);
    } else if (origMat instanceof THREE.Material) {
      child.material = applyToSingle(origMat);
    }
  });

  return clonedMaterials;
}
