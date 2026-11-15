import React, { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { Ruler, X } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { collectSurfaceTargetMeshes, getObjectWorldMeshBox } from '../../utils/surfaceSnap';

export interface RulerMeasurement {
  start: [number, number, number] | null;
  startLabel: string;
  end: [number, number, number] | null;
  endLabel: string;
  hover: [number, number, number] | null;
  hoverLabel: string;
}

type Listener = (state: RulerMeasurement) => void;
let currentMeasurement: RulerMeasurement = {
  start: null,
  startLabel: '',
  end: null,
  endLabel: '',
  hover: null,
  hoverLabel: '',
};
const listeners = new Set<Listener>();

function emitMeasurement(next: RulerMeasurement) {
  currentMeasurement = next;
  listeners.forEach((fn) => fn(currentMeasurement));
}

export function clearRulerMeasurement() {
  emitMeasurement({
    start: null,
    startLabel: '',
    end: null,
    endLabel: '',
    hover: currentMeasurement.hover,
    hoverLabel: currentMeasurement.hoverLabel,
  });
}

function roundPt(v: THREE.Vector3): [number, number, number] {
  return [Number(v.x.toFixed(4)), Number(v.y.toFixed(4)), Number(v.z.toFixed(4))];
}

function findOwningSceneObjectName(
  mesh: THREE.Object3D,
  objects: ReturnType<typeof useSceneStore.getState>['objects']
): string {
  let cur: THREE.Object3D | null = mesh;
  while (cur) {
    if (cur.name && cur.name.startsWith('scene_obj_')) {
      const id = cur.name.slice('scene_obj_'.length);
      const found = objects.find((o) => o.id === id);
      if (found) return found.name;
    }
    cur = cur.parent;
  }
  return 'Object';
}

/**
 * Inside-<Canvas> component that raycasts against scene objects (with smart corner/surface/bounds
 * snapping) or the Y=0 ground plane when the Ruler tool is active.
 */
export const RulerSceneTool: React.FC = () => {
  const rulerActive = useSceneStore((s) => s.rulerActive);
  const { gl, scene, camera } = useThree();
  const [measurement, setMeasurement] = useState<RulerMeasurement>(currentMeasurement);

  useEffect(() => {
    const listener: Listener = (next) => {
      setMeasurement({ ...next });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!rulerActive) {
      emitMeasurement({
        start: null,
        startLabel: '',
        end: null,
        endLabel: '',
        hover: null,
        hoverLabel: '',
      });
      return;
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeTarget = new THREE.Vector3();
    const projVec = new THREE.Vector3();

    const pickWorldPoint = (
      clientX: number,
      clientY: number,
      disableKeySnap: boolean
    ): { point: [number, number, number]; label: string } | null => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      ndc.x = (localX / rect.width) * 2 - 1;
      ndc.y = -(localY / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      const objects = useSceneStore.getState().objects;
      const targetMeshes = collectSurfaceTargetMeshes(scene, objects, []);

      // 1. Raycast against actual scene object meshes (including backfaces for thin geometry)
      const meshHits = raycaster.intersectObjects(targetMeshes, false);

      // 2. Check screen-space proximity (<= 14px) to object bounding-box corners & face centers
      if (!disableKeySnap) {
        let bestSnap: { pt: THREE.Vector3; label: string; screenDist: number; camDist: number } | null = null;
        for (const obj of objects) {
          if (obj.isGroup || !obj.visible) continue;
          const obj3d = scene.getObjectByName(`scene_obj_${obj.id}`);
          if (!obj3d) continue;
          const box = getObjectWorldMeshBox(obj3d);
          if (box.isEmpty()) continue;

          const min = box.min;
          const max = box.max;
          const midX = (min.x + max.x) * 0.5;
          const midY = (min.y + max.y) * 0.5;
          const midZ = (min.z + max.z) * 0.5;

          const candidates: Array<{ pt: THREE.Vector3; tag: string }> = [
            // 8 corners
            { pt: new THREE.Vector3(min.x, min.y, min.z), tag: 'Base Corner' },
            { pt: new THREE.Vector3(max.x, min.y, min.z), tag: 'Base Corner' },
            { pt: new THREE.Vector3(min.x, min.y, max.z), tag: 'Base Corner' },
            { pt: new THREE.Vector3(max.x, min.y, max.z), tag: 'Base Corner' },
            { pt: new THREE.Vector3(min.x, max.y, min.z), tag: 'Top Corner' },
            { pt: new THREE.Vector3(max.x, max.y, min.z), tag: 'Top Corner' },
            { pt: new THREE.Vector3(min.x, max.y, max.z), tag: 'Top Corner' },
            { pt: new THREE.Vector3(max.x, max.y, max.z), tag: 'Top Corner' },
            // 6 face centers + center
            { pt: new THREE.Vector3(midX, min.y, midZ), tag: 'Bottom Center' },
            { pt: new THREE.Vector3(midX, max.y, midZ), tag: 'Top Center' },
            { pt: new THREE.Vector3(min.x, midY, midZ), tag: 'Side Center' },
            { pt: new THREE.Vector3(max.x, midY, midZ), tag: 'Side Center' },
            { pt: new THREE.Vector3(midX, midY, min.z), tag: 'Side Center' },
            { pt: new THREE.Vector3(midX, midY, max.z), tag: 'Side Center' },
            { pt: new THREE.Vector3(midX, midY, midZ), tag: 'Center' },
          ];

          for (const c of candidates) {
            projVec.copy(c.pt).project(camera);
            if (projVec.z < -1 || projVec.z > 1) continue;
            const sx = (projVec.x * 0.5 + 0.5) * rect.width;
            const sy = (-projVec.y * 0.5 + 0.5) * rect.height;
            const sDist = Math.hypot(sx - localX, sy - localY);
            if (sDist <= 14) {
              const cDist = camera.position.distanceTo(c.pt);
              if (
                !bestSnap ||
                sDist < bestSnap.screenDist - 2 ||
                (Math.abs(sDist - bestSnap.screenDist) <= 2 && cDist < bestSnap.camDist)
              ) {
                bestSnap = {
                  pt: c.pt,
                  label: `${obj.name} (${c.tag})`,
                  screenDist: sDist,
                  camDist: cDist,
                };
              }
            }
          }
        }

        if (bestSnap) {
          return { point: roundPt(bestSnap.pt), label: bestSnap.label };
        }
      }

      // 3. Exact mesh surface hit on a scene object
      if (meshHits.length > 0) {
        const hit = meshHits[0];
        const objName = findOwningSceneObjectName(hit.object, objects);
        return { point: roundPt(hit.point), label: `${objName} (Surface)` };
      }

      // 4. Fallback: raycast against object world bounding boxes if cursor is over an object's bounds
      let closestBoxHit: { pt: THREE.Vector3; dist: number; label: string } | null = null;
      const boxHitPt = new THREE.Vector3();
      for (const obj of objects) {
        if (obj.isGroup || !obj.visible) continue;
        const obj3d = scene.getObjectByName(`scene_obj_${obj.id}`);
        if (!obj3d) continue;
        const box = getObjectWorldMeshBox(obj3d);
        if (box.isEmpty()) continue;
        if (raycaster.ray.intersectBox(box, boxHitPt)) {
          const d = raycaster.ray.origin.distanceTo(boxHitPt);
          if (!closestBoxHit || d < closestBoxHit.dist) {
            closestBoxHit = {
              pt: boxHitPt.clone(),
              dist: d,
              label: `${obj.name} (Bounds)`,
            };
          }
        }
      }
      if (closestBoxHit) {
        return { point: roundPt(closestBoxHit.pt), label: closestBoxHit.label };
      }

      // 5. Fallback: Y = 0 ground plane
      if (raycaster.ray.intersectPlane(groundPlane, planeTarget)) {
        return {
          point: [
            Number(planeTarget.x.toFixed(4)),
            0,
            Number(planeTarget.z.toFixed(4)),
          ],
          label: 'Ground (Y = 0m)',
        };
      }
      return null;
    };

    let downPos: { x: number; y: number } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      downPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const picked = pickWorldPoint(e.clientX, e.clientY, e.altKey);
      if (picked) {
        emitMeasurement({
          ...currentMeasurement,
          hover: picked.point,
          hoverLabel: picked.label,
        });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !downPos) return;
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      downPos = null;
      if (dist > 5) return; // Ignore camera orbit drags

      const picked = pickWorldPoint(e.clientX, e.clientY, e.altKey);
      if (!picked) return;

      if (!currentMeasurement.start || currentMeasurement.end !== null) {
        emitMeasurement({
          start: picked.point,
          startLabel: picked.label,
          end: null,
          endLabel: '',
          hover: picked.point,
          hoverLabel: picked.label,
        });
      } else {
        emitMeasurement({
          ...currentMeasurement,
          end: picked.point,
          endLabel: picked.label,
          hover: picked.point,
          hoverLabel: picked.label,
        });
      }
    };

    const dom = gl.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, [rulerActive, gl, scene, camera]);

  if (!rulerActive) return null;

  const startPt = measurement.start;
  const activeEnd = measurement.end ?? (startPt ? measurement.hover : null);
  const hoverPt = measurement.hover;

  return (
    <group userData={{ isRulerHelper: true }}>
      {/* Live hover cursor indicator before or after placing points */}
      {hoverPt && (
        <>
          <mesh position={hoverPt} userData={{ isRulerHelper: true }}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" depthTest={false} transparent opacity={0.85} />
          </mesh>
          {Math.abs(hoverPt[1]) > 0.01 && (
            <Line
              points={[hoverPt, [hoverPt[0], 0, hoverPt[2]]]}
              color="#38bdf8"
              lineWidth={1}
              depthTest={false}
            />
          )}
        </>
      )}

      {/* Start point + vertical drop line to floor */}
      {startPt && (
        <>
          <mesh position={startPt} userData={{ isRulerHelper: true }}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshBasicMaterial color="#f59e0b" depthTest={false} />
          </mesh>
          {Math.abs(startPt[1]) > 0.01 && (
            <Line
              points={[startPt, [startPt[0], 0, startPt[2]]]}
              color="#f59e0b"
              lineWidth={1.2}
              depthTest={false}
            />
          )}
        </>
      )}

      {/* End (or rubber-band hover) point + measurement line */}
      {startPt && activeEnd && (
        <>
          <mesh position={activeEnd} userData={{ isRulerHelper: true }}>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshBasicMaterial color="#10b981" depthTest={false} />
          </mesh>
          {Math.abs(activeEnd[1]) > 0.01 && (
            <Line
              points={[activeEnd, [activeEnd[0], 0, activeEnd[2]]]}
              color="#10b981"
              lineWidth={1.2}
              depthTest={false}
            />
          )}
          <Line
            points={[startPt, activeEnd]}
            color="#fbbf24"
            lineWidth={2.5}
            depthTest={false}
          />
        </>
      )}
    </group>
  );
};

/**
 * HUD overlay rendered inside Viewport container when Ruler mode is active.
 */
export const RulerHudOverlay: React.FC = () => {
  const rulerActive = useSceneStore((s) => s.rulerActive);
  const setRulerActive = useSceneStore((s) => s.setRulerActive);
  const [measurement, setMeasurement] = useState<RulerMeasurement>(currentMeasurement);

  useEffect(() => {
    const listener: Listener = (next) => {
      setMeasurement({ ...next });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!rulerActive) return null;

  const startPt = measurement.start;
  const activeEnd = measurement.end ?? (startPt ? measurement.hover : null);
  let dist = 0;
  let dx = 0;
  let dy = 0;
  let dz = 0;
  if (startPt && activeEnd) {
    dx = Math.abs(activeEnd[0] - startPt[0]);
    dy = Math.abs(activeEnd[1] - startPt[1]);
    dz = Math.abs(activeEnd[2] - startPt[2]);
    dist = Math.hypot(dx, dy, dz);
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(24, 26, 31, 0.94)',
        border: '1px solid rgba(245, 158, 11, 0.6)',
        borderRadius: '6px',
        padding: '8px 14px',
        color: 'var(--text-main)',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 15,
        boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 600 }}>
        <Ruler size={14} />
        Ruler
      </span>

      {measurement.hover && (
        <span
          style={{
            padding: '2px 7px',
            borderRadius: '4px',
            backgroundColor: 'rgba(56, 189, 248, 0.14)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#7dd3fc',
            fontSize: '11px',
          }}
        >
          Target: {measurement.hoverLabel} (Y={measurement.hover[1].toFixed(2)}m)
        </span>
      )}

      {!startPt ? (
        <span style={{ color: 'var(--text-muted)' }}>
          Click object surface/corner or floor to set start point (hold Alt to disable corner snap)
        </span>
      ) : !activeEnd ? (
        <span style={{ color: 'var(--text-muted)' }}>Click second point to finish</span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'monospace' }}>
          <strong style={{ color: '#fff', fontSize: '13px' }}>{dist.toFixed(3)} m</strong>
          <span style={{ color: 'var(--text-muted)' }}>
            (ΔX {dx.toFixed(2)}m · ΔY {dy.toFixed(2)}m · ΔZ {dz.toFixed(2)}m)
          </span>
        </div>
      )}

      {startPt && (
        <button
          onClick={clearRulerMeasurement}
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
          }}
        >
          Clear
        </button>
      )}
      <button
        onClick={() => setRulerActive(false)}
        title="Exit Ruler (M)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px',
          color: 'var(--text-muted)',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
