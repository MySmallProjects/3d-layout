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
  const { objects, addObject, deselectAll } = useSceneStore();
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
        const camera = (canvas as any).__r3f?.store?.getState()?.camera as THREE.Camera | undefined;
        if (camera) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const hitPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) {
            dropPosition = [
              parseFloat(hitPoint.x.toFixed(2)),
              0,
              parseFloat(hitPoint.z.toFixed(2))
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
        <CaptureController />

        {/* Render all scene instances */}
        {objects.map((obj) => (
          <SceneObjectRenderer key={obj.id} object={obj} />
        ))}
      </Canvas>
    </div>
  );
};
