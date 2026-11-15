import React, { useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import {
  decomposeMatrixToTransform,
  filterTopLevelSelected,
  getParentWorldMatrix,
  getWorldMatrix,
} from '../../utils/sceneHierarchy';
import { collectSurfaceTargetMeshes, computeDropDeltaY } from '../../utils/surfaceSnap';

interface InitialObjectTransform {
  id: string;
  matrix: THREE.Matrix4;
  wasNegativeDet: boolean;
}

export const TransformGizmo: React.FC = () => {
  const { scene } = useThree();
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
    () => filterTopLevelSelected(selectedObjectIds, objects),
    [objects, selectedObjectIds]
  );

  // Calculate selection center in world space
  const selectionCenter = useMemo(() => {
    if (selectedObjects.length === 0) return new THREE.Vector3();
    const sum = new THREE.Vector3();
    for (const obj of selectedObjects) {
      const worldPos = new THREE.Vector3().setFromMatrixPosition(getWorldMatrix(obj, objects));
      sum.add(worldPos);
    }
    return sum.divideScalar(selectedObjects.length);
  }, [selectedObjects, objects]);

  // Sync pivot position/rotation/scale in world space when selection or external transform changes
  useEffect(() => {
    if (!pivotRef.current || isGizmoDragging || selectedObjects.length === 0) return;

    if (selectedObjects.length === 1) {
      const target = selectedObjects[0];
      const tf = decomposeMatrixToTransform(getWorldMatrix(target, objects));
      pivotRef.current.position.set(...tf.position);
      pivotRef.current.rotation.set(...tf.rotation);
      pivotRef.current.scale.set(...tf.scale);
    } else {
      pivotRef.current.position.copy(selectionCenter);
      pivotRef.current.rotation.set(0, 0, 0);
      pivotRef.current.scale.set(1, 1, 1);
    }
    pivotRef.current.updateMatrixWorld();
  }, [selectedObjects, objects, selectionCenter, isGizmoDragging]);

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
            const matrix = getWorldMatrix(o, objects);
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

    const activeAxis = controlsRef.current?.axis as string | null | undefined;
    const shouldSurfaceSnap =
      snap.surfaceSnapEnabled &&
      transformMode === 'translate' &&
      activeAxis !== 'Y';

    if (selectedObjects.length === 1) {
      const target = selectedObjects[0];
      pivotRef.current.updateMatrixWorld();
      const parentWorldInv = getParentWorldMatrix(target.parentId, objects).invert();
      const localMat = new THREE.Matrix4().multiplyMatrices(
        parentWorldInv,
        pivotRef.current.matrixWorld
      );
      const tf = decomposeMatrixToTransform(localMat);

      if (shouldSurfaceSnap) {
        const obj3d = scene.getObjectByName(`scene_obj_${target.id}`);
        if (obj3d) {
          obj3d.position.set(...tf.position);
          obj3d.rotation.set(...tf.rotation);
          obj3d.scale.set(...tf.scale);
          const targetMeshes = collectSurfaceTargetMeshes(scene, objects, [target.id]);
          const dy = computeDropDeltaY(obj3d, targetMeshes, 0.75);
          if (dy !== null) {
            const localDelta = new THREE.Vector3(0, dy, 0);
            if (target.parentId) {
              localDelta.applyMatrix4(parentWorldInv.clone().setPosition(0, 0, 0));
            }
            tf.position = [
              tf.position[0] + localDelta.x,
              tf.position[1] + localDelta.y,
              tf.position[2] + localDelta.z,
            ];
          }
        }
      }

      updateObjectTransform(target.id, {
        position: tf.position,
        rotation: tf.rotation,
        scale: tf.scale
      });
    } else if (dragStartRef.current?.isMulti) {
      pivotRef.current.updateMatrixWorld();
      const deltaMatrix = new THREE.Matrix4().multiplyMatrices(
        pivotRef.current.matrixWorld,
        dragStartRef.current.pivotInverse
      );

      const ignoreAll = selectedObjects.map((o) => o.id);
      const targetMeshes = shouldSurfaceSnap
        ? collectSurfaceTargetMeshes(scene, objects, ignoreAll)
        : [];

      const updates = dragStartRef.current.initialObjects.map((item) => {
        const obj = objects.find((o) => o.id === item.id);
        const parentWorldInv = getParentWorldMatrix(obj?.parentId ?? null, objects).invert();
        const newWorldMatrix = new THREE.Matrix4().multiplyMatrices(deltaMatrix, item.matrix);
        const newLocalMatrix = new THREE.Matrix4().multiplyMatrices(parentWorldInv, newWorldMatrix);
        const tf = decomposeMatrixToTransform(newLocalMatrix);

        if (shouldSurfaceSnap && obj) {
          const obj3d = scene.getObjectByName(`scene_obj_${obj.id}`);
          if (obj3d) {
            obj3d.position.set(...tf.position);
            obj3d.rotation.set(...tf.rotation);
            obj3d.scale.set(...tf.scale);
            const dy = computeDropDeltaY(obj3d, targetMeshes, 0.75);
            if (dy !== null) {
              const localDelta = new THREE.Vector3(0, dy, 0);
              if (obj.parentId) {
                localDelta.applyMatrix4(parentWorldInv.clone().setPosition(0, 0, 0));
              }
              tf.position = [
                tf.position[0] + localDelta.x,
                tf.position[1] + localDelta.y,
                tf.position[2] + localDelta.z,
              ];
            }
          }
        }

        return {
          id: item.id,
          position: tf.position,
          rotation: tf.rotation,
          scale: tf.scale
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
