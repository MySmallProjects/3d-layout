import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { GroundPlaneConfig, SceneObject } from '@shared/types/scene';
import { loadCachedGltf } from '../components/viewport/SceneObjectRenderer';
import { wrapWithAppliedNormalisation } from './modelNormalisation';
import { applyInstanceMaterialState } from './materialOverride';
import { createGroundPlaneMesh } from './groundPlaneThree';
import { isEffectivelyVisible } from './sceneHierarchy';

function ensureExportableGeometry(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geom = mesh.geometry as THREE.BufferGeometry;
    const clonedGeom = geom.clone();

    for (const name of Object.keys(clonedGeom.attributes)) {
      const attr = clonedGeom.attributes[name];
      const isInterleaved = (attr as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute;
      const isNonFloat = !(attr.array instanceof Float32Array) && !name.startsWith('skinIndex');
      if (isInterleaved || isNonFloat) {
        const count = attr.count;
        const itemSize = attr.itemSize;
        const floatArray = new Float32Array(count * itemSize);
        for (let i = 0; i < count; i++) {
          if (itemSize >= 1) floatArray[i * itemSize] = attr.getX(i);
          if (itemSize >= 2) floatArray[i * itemSize + 1] = attr.getY(i);
          if (itemSize >= 3) floatArray[i * itemSize + 2] = attr.getZ(i);
          if (itemSize >= 4) floatArray[i * itemSize + 3] = attr.getW(i);
        }
        clonedGeom.setAttribute(name, new THREE.BufferAttribute(floatArray, itemSize, false));
      }
    }

    mesh.geometry = clonedGeom;
  });
}

/**
 * Exports all visible scene objects (preserving hierarchy, transforms, normalisation,
 * material overrides, and solid/textured ground plane) into a combined binary .glb file.
 */
export async function exportSceneAsGlb(
  sceneName: string,
  objects: SceneObject[],
  groundPlane: GroundPlaneConfig
): Promise<void> {
  const exportScene = new THREE.Scene();
  exportScene.name = sceneName || 'Scene';
  const disposables: Array<{ dispose(): void }> = [];

  // Build parent-child map for visible objects
  const nodeMap = new Map<string, THREE.Object3D>();
  for (const obj of objects) {
    if (!isEffectivelyVisible(obj, objects)) continue;
    if (obj.isGroup) {
      const g = new THREE.Group();
      g.name = obj.name;
      g.position.set(...obj.position);
      g.rotation.set(...obj.rotation);
      g.scale.set(...obj.scale);
      nodeMap.set(obj.id, g);
    } else if (obj.modelId) {
      const entry = await loadCachedGltf(obj.modelId);
      const clone = entry.scene.clone(true);
      ensureExportableGeometry(clone);
      const isMirrored = obj.scale[0] * obj.scale[1] * obj.scale[2] < 0;
      const clonedMats = applyInstanceMaterialState(
        clone,
        entry.scene,
        isMirrored,
        obj.materialOverride
      );
      disposables.push(...clonedMats);
      const wrapped = wrapWithAppliedNormalisation(clone, obj.appliedNormalisation);
      wrapped.name = obj.name;
      wrapped.position.set(...obj.position);
      wrapped.rotation.set(...obj.rotation);
      wrapped.scale.set(...obj.scale);
      nodeMap.set(obj.id, wrapped);
    }
  }

  for (const obj of objects) {
    const node = nodeMap.get(obj.id);
    if (!node) continue;
    const parentNode = obj.parentId ? nodeMap.get(obj.parentId) : undefined;
    if (parentNode) {
      parentNode.add(node);
    } else {
      exportScene.add(node);
    }
  }

  exportScene.updateMatrixWorld(true);

  // Optional solid/textured ground plane sized to frame scene objects cleanly in external viewers
  if (groundPlane.visible && (groundPlane.type === 'color' || groundPlane.type === 'image')) {
    const sceneBox = new THREE.Box3().setFromObject(exportScene);
    let exportGroundSize = Math.min(groundPlane.size || 20, 20);
    if (!sceneBox.isEmpty()) {
      const spanX = Math.max(Math.abs(sceneBox.min.x), Math.abs(sceneBox.max.x)) * 2;
      const spanZ = Math.max(Math.abs(sceneBox.min.z), Math.abs(sceneBox.max.z)) * 2;
      exportGroundSize = Math.min(
        groundPlane.size || 100,
        Math.max(6, Math.ceil(Math.max(spanX, spanZ) * 1.5))
      );
    }
    const groundMesh = await createGroundPlaneMesh(
      { ...groundPlane, size: exportGroundSize },
      { groundPlaneEnabled: true, groundShadowOnly: false, groundColor: groundPlane.color || '#22252e' },
      false,
      disposables
    );
    if (groundMesh) {
      groundMesh.name = 'GroundPlane';
      exportScene.add(groundMesh);
      exportScene.updateMatrixWorld(true);
    }
  }

  try {
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(exportScene, {
      binary: true,
      onlyVisible: true,
      trs: true,
    });

    if (!(result instanceof ArrayBuffer)) {
      throw new Error('Expected binary GLB output from GLTFExporter');
    }

    const blob = new Blob([result], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const safeName =
      (sceneName || 'scene')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'scene';

    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.glb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    disposables.forEach((d) => d.dispose());
  }
}
