import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { SceneObject } from '../../types';
import { createConfiguredGLTFLoader } from '../../services/gltfLoader';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';

// In-memory cache for parsed GLTF scenes to avoid re-fetching identical 10MB files
const gltfCache = new Map<string, THREE.Group>();

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

  // Compute local bounding box wireframe geometry for selection/hover outline
  const { outlineGeometry, outlineCenter } = useMemo(() => {
    if (!modelGroup) {
      return { outlineGeometry: null, outlineCenter: new THREE.Vector3() };
    }
    const box = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

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
  }, [modelGroup]);

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

      {/* Render loaded GLTF model */}
      {modelGroup && !loadError && <primitive object={modelGroup} />}

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
