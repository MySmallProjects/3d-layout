import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

export const CameraControls: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, scene } = useThree();
  const {
    selectedObjectIds,
    focusTargetTimestamp,
    resetCameraTimestamp,
    pendingCameraRestoreTimestamp,
    cameraState,
    setCameraState,
    isGizmoDragging
  } = useSceneStore();

  const prevFocusRef = useRef(focusTargetTimestamp);
  const prevResetRef = useRef(resetCameraTimestamp);
  const prevRestoreRef = useRef(pendingCameraRestoreTimestamp);

  // Expose live camera state getter for scene save & autosave
  useEffect(() => {
    (window as any).__getCameraState = () => {
      const target = controlsRef.current?.target;
      return {
        position: [camera.position.x, camera.position.y, camera.position.z] as [number, number, number],
        target: target ? [target.x, target.y, target.z] as [number, number, number] : [0, 0, 0] as [number, number, number]
      };
    };
    return () => {
      delete (window as any).__getCameraState;
    };
  }, [camera]);

  // Restore camera state when loading or resetting a scene
  useEffect(() => {
    if (pendingCameraRestoreTimestamp === prevRestoreRef.current) return;
    prevRestoreRef.current = pendingCameraRestoreTimestamp;
    if (!controlsRef.current) return;

    camera.position.set(...cameraState.position);
    controlsRef.current.target.set(...cameraState.target);
    controlsRef.current.update();
  }, [pendingCameraRestoreTimestamp, cameraState, camera]);

  // Focus selected object(s) on F key or trigger
  useEffect(() => {
    if (focusTargetTimestamp === prevFocusRef.current) return;
    prevFocusRef.current = focusTargetTimestamp;

    if (!controlsRef.current || selectedObjectIds.length === 0) return;

    // Calculate collective bounding box of selected objects
    const box = new THREE.Box3();
    let hasObjects = false;

    for (const id of selectedObjectIds) {
      const obj = scene.getObjectByName(`scene_obj_${id}`);
      if (obj) {
        box.expandByObject(obj);
        hasObjects = true;
      }
    }

    if (!hasObjects || box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const cameraDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.8;

    const direction = camera.position.clone().sub(controlsRef.current.target).normalize();
    camera.position.copy(center).add(direction.multiplyScalar(Math.max(cameraDistance, 3)));
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, [focusTargetTimestamp, selectedObjectIds, scene, camera]);

  // Reset camera on Home key or trigger
  useEffect(() => {
    if (resetCameraTimestamp === prevResetRef.current) return;
    prevResetRef.current = resetCameraTimestamp;

    if (!controlsRef.current) return;

    camera.position.set(8, 6, 8);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
    setCameraState({ position: [8, 6, 8], target: [0, 0, 0] });
  }, [resetCameraTimestamp, camera, setCameraState]);

  const handleControlsEnd = () => {
    if (!controlsRef.current) return;
    const t = controlsRef.current.target;
    setCameraState({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [t.x, t.y, t.z]
    });
  };

  return (
    <DreiOrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isGizmoDragging}
      onEnd={handleControlsEnd}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={200}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  );
};
