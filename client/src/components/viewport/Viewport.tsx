import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import { CameraControls } from './CameraControls';
import { GridFloor } from './GridFloor';
import { BackgroundRenderer } from './BackgroundRenderer';
import { SceneObjectRenderer } from './SceneObjectRenderer';
import { TransformGizmo } from './TransformGizmo';
import { ArrowKeyController } from './useArrowKeyMovement';
import { LightingRig } from './LightingRig';
import { toAppliedNormalisation } from '../../utils/modelNormalisation';
import { filterTopLevelSelected } from '../../utils/sceneHierarchy';
import { collectSurfaceTargetMeshes, computeDropDeltaY } from '../../utils/surfaceSnap';

const SnapToFloorController: React.FC = () => {
  const { scene } = useThree();
  const { snapToFloorTimestamp, selectedObjectIds, objects, applyFloorOffset } = useSceneStore();
  const prevRef = useRef(snapToFloorTimestamp);

  useEffect(() => {
    if (snapToFloorTimestamp === prevRef.current) return;
    prevRef.current = snapToFloorTimestamp;

    const offsets: { id: string; deltaY: number }[] = [];
    for (const id of selectedObjectIds) {
      const target = objects.find((o) => o.id === id);
      if (!target || target.locked) continue;

      const obj3d = scene.getObjectByName(`scene_obj_${id}`);
      if (!obj3d) continue;

      obj3d.updateWorldMatrix(true, true);
      const box = new THREE.Box3();
      obj3d.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          box.expandByObject(child);
        }
      });

      if (!box.isEmpty()) {
        offsets.push({ id, deltaY: -box.min.y });
      }
    }

    if (offsets.length > 0) {
      applyFloorOffset(offsets);
    }
  }, [snapToFloorTimestamp, selectedObjectIds, objects, scene, applyFloorOffset]);

  return null;
};

const DropToSurfaceController: React.FC = () => {
  const { scene } = useThree();
  const { dropToSurfaceTimestamp, selectedObjectIds, objects, applyFloorOffset } = useSceneStore();
  const prevRef = useRef(dropToSurfaceTimestamp);

  useEffect(() => {
    if (dropToSurfaceTimestamp === prevRef.current) return;
    prevRef.current = dropToSurfaceTimestamp;

    const topSelected = filterTopLevelSelected(selectedObjectIds, objects);
    const offsets: { id: string; deltaY: number }[] = [];

    for (const target of topSelected) {
      const obj3d = scene.getObjectByName(`scene_obj_${target.id}`);
      if (!obj3d) continue;
      const targetMeshes = collectSurfaceTargetMeshes(scene, objects, [target.id]);
      const deltaY = computeDropDeltaY(obj3d, targetMeshes, 0.08);
      if (deltaY !== null) {
        offsets.push({ id: target.id, deltaY });
      }
    }

    if (offsets.length > 0) {
      applyFloorOffset(offsets);
    }
  }, [dropToSurfaceTimestamp, selectedObjectIds, objects, scene, applyFloorOffset]);

  return null;
};

const CaptureController: React.FC = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    (window as any).__captureViewportThumbnail = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL('image/png');
    };
    return () => {
      delete (window as any).__captureViewportThumbnail;
    };
  }, [gl, scene, camera]);

  return null;
};

export const Viewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { objects, snap, addObject, deselectAll } = useSceneStore();
  const { models } = useLibraryStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const modelId = e.dataTransfer.getData('application/3d-model-id');
    if (!modelId) return;

    const libraryModel = models.find((m) => m.id === modelId);
    const modelName = libraryModel ? libraryModel.name : 'Model';

    let dropPosition: [number, number, number] = [0, 0, 0];

    // Raycast onto y=0 floor plane
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        const r3fState = (canvas as any).__r3f?.store?.getState();
        const camera = r3fState?.camera as THREE.Camera | undefined;
        const r3fScene = r3fState?.scene as THREE.Scene | undefined;
        if (camera) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const floorHit = new THREE.Vector3();
          const hasFloorHit = Boolean(raycaster.ray.intersectPlane(floorPlane, floorHit));
          const floorDist = hasFloorHit ? raycaster.ray.origin.distanceTo(floorHit) : Infinity;

          let placedOnSurface = false;
          if (snap.surfaceSnapEnabled && r3fScene) {
            const targetMeshes = collectSurfaceTargetMeshes(r3fScene, objects, []);
            if (targetMeshes.length > 0) {
              const hits = raycaster.intersectObjects(targetMeshes, false);
              if (hits.length > 0 && hits[0].distance <= floorDist) {
                dropPosition = [
                  parseFloat(hits[0].point.x.toFixed(2)),
                  parseFloat(hits[0].point.y.toFixed(3)),
                  parseFloat(hits[0].point.z.toFixed(2))
                ];
                placedOnSurface = true;
              }
            }
          }

          if (!placedOnSurface && hasFloorHit) {
            dropPosition = [
              parseFloat(floorHit.x.toFixed(2)),
              0,
              parseFloat(floorHit.z.toFixed(2))
            ];
          }
        }
      }
    }

    addObject(
      modelId,
      modelName,
      dropPosition,
      toAppliedNormalisation(libraryModel?.normalisation)
    );
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        outline: 'none',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 500 }}
        dpr={[1, 1.5]} // Capped pixel ratio for fast edit mode performance
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance'
        }}
        onPointerMissed={() => deselectAll()}
      >
        {/* Fast edit-mode lighting preview */}
        <LightingRig />

        {/* Scene Environment / Background */}
        <BackgroundRenderer />

        {/* Infinite Grid Floor */}
        <GridFloor />

        {/* Camera Navigation */}
        <CameraControls />

        {/* Manipulation Gizmo & Controllers */}
        <TransformGizmo />
        <ArrowKeyController />
        <SnapToFloorController />
        <DropToSurfaceController />
        <CaptureController />

        {/* Render root scene instances (nested children render inside parent groups) */}
        {objects
          .filter((obj) => !obj.parentId || !objects.some((p) => p.id === obj.parentId))
          .map((obj) => (
            <SceneObjectRenderer key={obj.id} object={obj} />
          ))}
      </Canvas>
    </div>
  );
};
