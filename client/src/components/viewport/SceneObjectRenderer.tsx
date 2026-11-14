import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { SceneObject } from '../../types';
import { createConfiguredGLTFLoader } from '../../services/gltfLoader';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';

// In-memory cache for parsed GLTF scenes to avoid re-fetching identical 10MB files
const gltfCache = new Map<string, THREE.Group>();

export function invalidateGltfCache(modelId: string): void {
  gltfCache.delete(modelId);
}

interface SceneObjectRendererProps {
  object: SceneObject;
}

export const SceneObjectRenderer: React.FC<SceneObjectRendererProps> = ({ object }) => {
  const {
    selectedObjectIds,
    hoveredObjectId,
    selectObject,
    setHoveredObjectId
  } = useSceneStore();
  const { showToast } = useLibraryStore();

  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  const isSelected = selectedObjectIds.includes(object.id);
  const isHovered = hoveredObjectId === object.id && !isSelected;

  // Detect odd number of negative scale axes (mirrored winding)
  const isNegativeDet = object.scale[0] * object.scale[1] * object.scale[2] < 0;

  useEffect(() => {
    if (!modelGroup) return;
    modelGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.Material) {
            // DoubleSide ensures mirrored meshes (negative determinant) don't disappear due to backface culling
            mat.side = isNegativeDet ? THREE.DoubleSide : THREE.FrontSide;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [modelGroup, isNegativeDet]);

  useEffect(() => {
    let isCancelled = false;
    const fileUrl = `/api/models/${object.modelId}/file`;

    // Check cache
    if (gltfCache.has(object.modelId)) {
      const cached = gltfCache.get(object.modelId)!;
      setModelGroup(cached.clone(true));
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    createConfiguredGLTFLoader()
      .then((loader) => {
        loader.load(
          fileUrl,
          (gltf) => {
            if (isCancelled) return;
            gltfCache.set(object.modelId, gltf.scene);
            setModelGroup(gltf.scene.clone(true));
            setIsLoading(false);
          },
          undefined,
          (err) => {
            if (isCancelled) return;
            console.error(`Error loading model ${object.name}:`, err);
            const errMsg = `Failed to load 3D model for "${object.name}"`;
            setLoadError(errMsg);
            setIsLoading(false);
            showToast(errMsg, 'error');
          }
        );
      })
      .catch((err) => {
        if (isCancelled) return;
        setLoadError(err.message);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [object.modelId, object.name, showToast]);

  const appliedNorm = object.appliedNormalisation ?? null;

  // Compute local bounding box wireframe geometry for selection/hover outline
  const { outlineGeometry, outlineCenter } = useMemo(() => {
    if (!modelGroup) {
      return { outlineGeometry: null, outlineCenter: new THREE.Vector3() };
    }
    const rawBox = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    rawBox.getSize(size);
    rawBox.getCenter(center);

    if (appliedNorm) {
      center.add(new THREE.Vector3(...appliedNorm.pivotOffset));
      center.multiplyScalar(appliedNorm.scaleFactor);
      size.multiplyScalar(appliedNorm.scaleFactor);
    }

    // Expand box slightly so the outline does not clip into geometry
    const padding = 0.02;
    const boxGeo = new THREE.BoxGeometry(
      Math.max(size.x + padding, 0.1),
      Math.max(size.y + padding, 0.1),
      Math.max(size.z + padding, 0.1)
    );
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();

    return { outlineGeometry: edgesGeo, outlineCenter: center };
  }, [modelGroup, appliedNorm]);

  // Clean up geometry on unmount or model change
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

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (object.locked) return;
    selectObject(object.id, e.shiftKey);
  };

  const handlePointerOver = (e: any) => {
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
      {/* Loading state indicator */}
      {isLoading && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.6} />
        </mesh>
      )}

      {/* Load error placeholder box */}
      {loadError && (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ef4444" wireframe />
        </mesh>
      )}

      {/* Render loaded GLTF model (applying snapshot import normalisation when present) */}
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

      {/* Accurate local selection / hover bounding outline */}
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
    </group>
  );
};
