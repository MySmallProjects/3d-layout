import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/sceneStore';
import { filterTopLevelSelected, getParentWorldMatrix } from '../../utils/sceneHierarchy';

export const ArrowKeyController = () => {
  const { camera } = useThree();
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not fire while typing in any input
      const activeEl = document.activeElement as HTMLElement | null;
      const tag = activeEl?.tagName?.toLowerCase() || '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || activeEl?.isContentEditable) {
        return;
      }

      const relevantKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'];
      if (!relevantKeys.includes(e.key)) return;

      const state = useSceneStore.getState();
      const selected = filterTopLevelSelected(state.selectedObjectIds, state.objects);
      if (selected.length === 0) return;

      e.preventDefault();

      // Determine step size
      const baseStep = state.snap.positionValue || 0.5;
      let step = baseStep;
      if (e.shiftKey) step = baseStep * 4;
      else if (e.altKey) step = baseStep * 0.1;

      // Compute camera-relative horizontal basis vectors
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) {
        forward.set(0, 0, -1);
      } else {
        forward.normalize();
      }
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const delta = new THREE.Vector3();
      switch (e.key) {
        case 'ArrowUp':
          delta.copy(forward).multiplyScalar(step);
          break;
        case 'ArrowDown':
          delta.copy(forward).multiplyScalar(-step);
          break;
        case 'ArrowRight':
          delta.copy(right).multiplyScalar(step);
          break;
        case 'ArrowLeft':
          delta.copy(right).multiplyScalar(-step);
          break;
        case 'PageUp':
          delta.set(0, step, 0);
          break;
        case 'PageDown':
          delta.set(0, -step, 0);
          break;
      }

      // Begin transaction on first key of burst
      state.beginTransaction();

      // Apply movement in world space, converted to each object's parent space
      const updates = selected.map((o) => {
        const localDelta = o.parentId
          ? delta.clone().applyMatrix4(
              getParentWorldMatrix(o.parentId, state.objects).invert().setPosition(0, 0, 0)
            )
          : delta;
        return {
          id: o.id,
          position: [
            parseFloat((o.position[0] + localDelta.x).toFixed(4)),
            parseFloat((o.position[1] + localDelta.y).toFixed(4)),
            parseFloat((o.position[2] + localDelta.z).toFixed(4))
          ] as [number, number, number]
        };
      });
      state.updateMultipleTransforms(updates);

      // Debounce commit for single undo step per key burst
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
      burstTimerRef.current = window.setTimeout(() => {
        useSceneStore.getState().commitTransaction();
        burstTimerRef.current = null;
      }, 400);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, [camera]);

  return null;
};
