import React, { useEffect, useRef, useMemo } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';

interface InitialObjectTransform {
  id: string;
  matrix: THREE.Matrix4;
  wasNegativeDet: boolean;
}

export const TransformGizmo: React.FC = () => {
  const {
    objects,
    selectedObjectIds,
    transformMode,
    snap,
    isGizmoDragging,
    setIsGizmoDragging,
    updateObjectTransform,
    updateMultipleTransforms,
    beginTransaction,
    commitTransaction
  } = useSceneStore();

  const pivotRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  // Store initial state at drag start for multi-object group transforms
  const dragStartRef = useRef<{
    isMulti: boolean;
    pivotInverse: THREE.Matrix4;
    initialObjects: InitialObjectTransform[];
  } | null>(null);

  const selectedObjects = useMemo(
    () => objects.filter((o) => selectedObjectIds.includes(o.id) && !o.locked),
    [objects, selectedObjectIds]
  );

  // Calculate selection center
  const selectionCenter = useMemo(() => {
    if (selectedObjects.length === 0) return new THREE.Vector3();
    const sum = new THREE.Vector3();
    for (const obj of selectedObjects) {
      sum.add(new THREE.Vector3(...obj.position));
    }
    return sum.divideScalar(selectedObjects.length);
  }, [selectedObjects]);

  // Sync pivot position/rotation/scale when selection or external transform changes (and not dragging)
  useEffect(() => {
    if (!pivotRef.current || isGizmoDragging || selectedObjects.length === 0) return;

    if (selectedObjects.length === 1) {
      const target = selectedObjects[0];
      pivotRef.current.position.set(...target.position);
      pivotRef.current.rotation.set(...target.rotation);
      pivotRef.current.scale.set(...target.scale);
    } else {
      pivotRef.current.position.copy(selectionCenter);
      pivotRef.current.rotation.set(0, 0, 0);
      pivotRef.current.scale.set(1, 1, 1);
    }
    pivotRef.current.updateMatrixWorld();
  }, [selectedObjects, selectionCenter, isGizmoDragging]);

  // Attach dragging-changed listener to ensure OrbitControls disables properly
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event: { value: boolean }) => {
      const dragging = event.value;
      setIsGizmoDragging(dragging);

      if (dragging) {
        beginTransaction();
        if (pivotRef.current && selectedObjects.length > 1) {
          pivotRef.current.updateMatrixWorld();
          const pivotInverse = pivotRef.current.matrixWorld.clone().invert();
          const initialObjects: InitialObjectTransform[] = selectedObjects.map((o) => {
            const pos = new THREE.Vector3(...o.position);
            const euler = new THREE.Euler(...o.rotation);
            const quat = new THREE.Quaternion().setFromEuler(euler);
            const scl = new THREE.Vector3(...o.scale);
            const matrix = new THREE.Matrix4().compose(pos, quat, scl);
            const wasNegativeDet = o.scale[0] * o.scale[1] * o.scale[2] < 0;
            return { id: o.id, matrix, wasNegativeDet };
          });
          dragStartRef.current = { isMulti: true, pivotInverse, initialObjects };
        } else {
          dragStartRef.current = { isMulti: false, pivotInverse: new THREE.Matrix4(), initialObjects: [] };
        }
      } else {
        dragStartRef.current = null;
        commitTransaction();
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
    };
  }, [selectedObjects, setIsGizmoDragging, beginTransaction, commitTransaction]);

  const handleObjectChange = () => {
    if (!pivotRef.current || selectedObjects.length === 0) return;

    if (selectedObjects.length === 1) {
      const target = selectedObjects[0];
      const p = pivotRef.current.position;
      const r = pivotRef.current.rotation;
      const s = pivotRef.current.scale;

      updateObjectTransform(target.id, {
        position: [p.x, p.y, p.z],
        rotation: [r.x, r.y, r.z],
        scale: [s.x, s.y, s.z]
      });
    } else if (dragStartRef.current?.isMulti) {
      pivotRef.current.updateMatrixWorld();
      const deltaMatrix = new THREE.Matrix4().multiplyMatrices(
        pivotRef.current.matrixWorld,
        dragStartRef.current.pivotInverse
      );

      const updates = dragStartRef.current.initialObjects.map((item) => {
        const newMatrix = new THREE.Matrix4().multiplyMatrices(deltaMatrix, item.matrix);
        const newPos = new THREE.Vector3();
        const newQuat = new THREE.Quaternion();
        const newScale = new THREE.Vector3();
        newMatrix.decompose(newPos, newQuat, newScale);
        const newEuler = new THREE.Euler().setFromQuaternion(newQuat);

        return {
          id: item.id,
          position: [newPos.x, newPos.y, newPos.z] as [number, number, number],
          rotation: [newEuler.x, newEuler.y, newEuler.z] as [number, number, number],
          scale: [newScale.x, newScale.y, newScale.z] as [number, number, number]
        };
      });

      updateMultipleTransforms(updates);
    }
  };

  if (selectedObjects.length === 0) {
    return <group ref={pivotRef} />;
  }

  return (
    <>
      <group ref={pivotRef} />
      <TransformControls
        ref={controlsRef}
        object={pivotRef as React.MutableRefObject<THREE.Object3D>}
        mode={transformMode}
        translationSnap={snap.positionEnabled ? snap.positionValue : null}
        rotationSnap={snap.rotationEnabled ? (snap.rotationValue * Math.PI) / 180 : null}
        scaleSnap={snap.scaleEnabled ? snap.scaleValue : null}
        onObjectChange={handleObjectChange}
      />
    </>
  );
};
