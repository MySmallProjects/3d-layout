import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { SceneObject } from '../../types';
import { createConfiguredGLTFLoader } from '../../services/gltfLoader';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import { applyInstanceMaterialState } from '../../utils/materialOverride';

interface CachedGltfEntry {
  scene: THREE.Group;
  localBox: THREE.Box3;
}

// Shared cache of parsed GLTF scenes + precomputed local bounding boxes
const gltfCache = new Map<string, CachedGltfEntry>();
// In-flight promise cache so 20+ instances of the same 10MB model only download & parse once
const gltfPromiseCache = new Map<string, Promise<CachedGltfEntry>>();

function disposeGroupResources(root: THREE.Object3D): void {
  const disposedGeoms = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();
  const disposedTexs = new Set<THREE.Texture>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.geometry && !disposedGeoms.has(child.geometry)) {
      disposedGeoms.add(child.geometry);
      child.geometry.dispose();
    }
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat || disposedMats.has(mat)) continue;
      disposedMats.add(mat);
      for (const val of Object.values(mat)) {
        if (
          val &&
          typeof val === 'object' &&
          'isTexture' in val &&
          (val as THREE.Texture).isTexture &&
          !disposedTexs.has(val as THREE.Texture)
        ) {
          disposedTexs.add(val as THREE.Texture);
          (val as THREE.Texture).dispose();
        }
      }
      mat.dispose();
    }
  });
}

export function invalidateGltfCache(modelId: string): void {
  const existing = gltfCache.get(modelId);
  if (existing) {
    disposeGroupResources(existing.scene);
    gltfCache.delete(modelId);
  }
  gltfPromiseCache.delete(modelId);
}

export function getCachedGltfEntry(modelId: string): CachedGltfEntry | undefined {
  return gltfCache.get(modelId);
}

function normalizeGeometryAttributes(geom: THREE.BufferGeometry): void {
  for (const name of Object.keys(geom.attributes)) {
    const attr = geom.attributes[name];
    const isInterleaved = (attr as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute;
    const isNonFloat = !(attr.array instanceof Float32Array) && !name.startsWith('skinIndex');
    if (isInterleaved || isNonFloat) {
      const count = attr.count;
      const itemSize = attr.itemSize;
      const floatArray = new Float32Array(count * itemSize);
      const isNormal = name === 'normal';
      const v = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        if (isNormal && itemSize === 3) {
          v.set(attr.getX(i), attr.getY(i), attr.getZ(i));
          if (v.lengthSq() > 0) v.normalize();
          floatArray[i * 3] = v.x;
          floatArray[i * 3 + 1] = v.y;
          floatArray[i * 3 + 2] = v.z;
        } else {
          if (itemSize >= 1) floatArray[i * itemSize] = attr.getX(i);
          if (itemSize >= 2) floatArray[i * itemSize + 1] = attr.getY(i);
          if (itemSize >= 3) floatArray[i * itemSize + 2] = attr.getZ(i);
          if (itemSize >= 4) floatArray[i * itemSize + 3] = attr.getW(i);
        }
      }
      geom.setAttribute(name, new THREE.BufferAttribute(floatArray, itemSize, false));
    }
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
}

export async function loadCachedGltf(modelId: string): Promise<CachedGltfEntry> {
  const hit = gltfCache.get(modelId);
  if (hit) return hit;

  const inflight = gltfPromiseCache.get(modelId);
  if (inflight) return inflight;

  const fileUrl = `/api/models/${modelId}/file`;
  const promise = createConfiguredGLTFLoader()
    .then(
      (loader) =>
        new Promise<CachedGltfEntry>((resolve, reject) => {
          loader.load(
            fileUrl,
            (gltf) => {
              gltf.scene.updateMatrixWorld(true);
              gltf.scene.traverse((child) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                  normalizeGeometryAttributes(child.geometry);
                  child.frustumCulled = true;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              const localBox = new THREE.Box3().setFromObject(gltf.scene);
              const entry: CachedGltfEntry = { scene: gltf.scene, localBox };
              gltfCache.set(modelId, entry);
              gltfPromiseCache.delete(modelId);
              resolve(entry);
            },
            undefined,
            (err) => {
              gltfPromiseCache.delete(modelId);
              reject(err);
            }
          );
        })
    )
    .catch((err) => {
      gltfPromiseCache.delete(modelId);
      throw err;
    });

  gltfPromiseCache.set(modelId, promise);
  return promise;
}

interface SceneObjectRendererProps {
  object: SceneObject;
}

export const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({ object }) => {
  const {
    objects,
    selectedObjectIds,
    hoveredObjectId,
    selectObject,
    setHoveredObjectId,
  } = useSceneStore();
  const { showToast } = useLibraryStore();

  const childObjects = useMemo(
    () => objects.filter((o) => o.parentId === object.id),
    [objects, object.id]
  );

  const [cachedEntry, setCachedEntry] = useState<CachedGltfEntry | null>(null);
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const clonedMatsRef = useRef<THREE.Material[]>([]);

  const isSelected = selectedObjectIds.includes(object.id);
  const isHovered = hoveredObjectId === object.id && !isSelected;

  // Detect odd number of negative scale axes (mirrored winding)
  const isNegativeDet = object.scale[0] * object.scale[1] * object.scale[2] < 0;

  useEffect(() => {
    if (object.isGroup) {
      setCachedEntry(null);
      setModelGroup(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let isCancelled = false;
    const hit = gltfCache.get(object.modelId);
    if (hit) {
      setCachedEntry(hit);
      setModelGroup(hit.scene.clone(true));
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    loadCachedGltf(object.modelId)
      .then((entry) => {
        if (isCancelled) return;
        setCachedEntry(entry);
        setModelGroup(entry.scene.clone(true));
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error(`Error loading model ${object.name}:`, err);
        const errMsg = `Failed to load 3D model for "${object.name}"`;
        setLoadError(errMsg);
        setIsLoading(false);
        showToast(errMsg, 'error');
      });

    return () => {
      isCancelled = true;
    };
  }, [object.isGroup, object.modelId, object.name, showToast]);

  // Apply per-instance material overrides or mirrored DoubleSide winding, disposing previous clones
  useEffect(() => {
    for (const m of clonedMatsRef.current) {
      m.dispose();
    }
    clonedMatsRef.current = [];

    if (!modelGroup || !cachedEntry) return;
    clonedMatsRef.current = applyInstanceMaterialState(
      modelGroup,
      cachedEntry.scene,
      isNegativeDet,
      object.materialOverride
    );

    return () => {
      for (const m of clonedMatsRef.current) {
        m.dispose();
      }
      clonedMatsRef.current = [];
    };
  }, [modelGroup, cachedEntry, isNegativeDet, object.materialOverride]);

  const appliedNorm = object.appliedNormalisation ?? null;

  // Compute local bounding box wireframe geometry in O(1) from precomputed localBox
  const { outlineGeometry, outlineCenter } = useMemo(() => {
    if (!cachedEntry || cachedEntry.localBox.isEmpty()) {
      return { outlineGeometry: null, outlineCenter: new THREE.Vector3() };
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    cachedEntry.localBox.getSize(size);
    cachedEntry.localBox.getCenter(center);

    if (appliedNorm) {
      center.add(new THREE.Vector3(...appliedNorm.pivotOffset));
      center.multiplyScalar(appliedNorm.scaleFactor);
      size.multiplyScalar(appliedNorm.scaleFactor);
    }

    const padding = 0.02;
    const boxGeo = new THREE.BoxGeometry(
      Math.max(size.x + padding, 0.1),
      Math.max(size.y + padding, 0.1),
      Math.max(size.z + padding, 0.1)
    );
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();

    return { outlineGeometry: edgesGeo, outlineCenter: center };
  }, [cachedEntry, appliedNorm]);

  useEffect(() => {
    return () => {
      if (outlineGeometry) {
        outlineGeometry.dispose();
      }
    };
  }, [outlineGeometry]);

  if (!object.visible) {
    return null;
  }

  const handleClick = (e: { stopPropagation: () => void; shiftKey?: boolean }) => {
    if (useSceneStore.getState().rulerActive) return;
    e.stopPropagation();
    if (object.locked) return;
    selectObject(object.id, Boolean(e.shiftKey));
  };

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (object.locked) return;
    setHoveredObjectId(object.id);
  };

  const handlePointerOut = () => {
    if (hoveredObjectId === object.id) {
      setHoveredObjectId(null);
    }
  };

  return (
    <group
      ref={groupRef}
      name={`scene_obj_${object.id}`}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {isLoading && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.6} />
        </mesh>
      )}

      {loadError && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
      )}

      {modelGroup && !loadError && (
        appliedNorm ? (
          <group scale={appliedNorm.scaleFactor}>
            <group position={appliedNorm.pivotOffset}>
              <primitive object={modelGroup} />
            </group>
          </group>
        ) : (
          <primitive object={modelGroup} />
        )
      )}

      {(isSelected || isHovered) && outlineGeometry && (
        <lineSegments
          geometry={outlineGeometry}
          position={outlineCenter}
          renderOrder={999}
        >
          <lineBasicMaterial
            color={isSelected ? '#3b82f6' : '#94a3b8'}
            linewidth={isSelected ? 2 : 1}
            depthTest={false}
            transparent
            opacity={isSelected ? 0.95 : 0.45}
          />
        </lineSegments>
      )}

      {childObjects.map((child) => (
        <SceneObjectRenderer key={child.id} object={child} />
      ))}
    </group>
  );
};
