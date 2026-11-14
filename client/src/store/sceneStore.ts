import { create } from 'zustand';
import { SceneObject, BackgroundConfig } from '../types';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SnapSettings {
  positionEnabled: boolean;
  positionValue: number;
  rotationEnabled: boolean;
  rotationValue: number; // in degrees
  scaleEnabled: boolean;
  scaleValue: number;
}

const MAX_HISTORY_DEPTH = 50;

interface SceneState {
  objects: SceneObject[];
  selectedObjectIds: string[];
  hoveredObjectId: string | null;
  gridVisible: boolean;
  background: BackgroundConfig;
  focusTargetTimestamp: number;
  resetCameraTimestamp: number;
  snapToFloorTimestamp: number;

  // Transform & Snapping
  transformMode: TransformMode;
  isGizmoDragging: boolean;
  snap: SnapSettings;

  // Undo / Redo History
  past: SceneObject[][];
  future: SceneObject[][];
  transactionSnapshot: SceneObject[] | null;

  // Actions
  addObject: (modelId: string, modelName: string, position: [number, number, number]) => SceneObject;
  selectObject: (id: string, multiSelect?: boolean) => void;
  deselectAll: () => void;
  setHoveredObjectId: (id: string | null) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  renameObject: (id: string, name: string) => void;
  duplicateObject: (id: string) => SceneObject | null;
  duplicateSelected: () => void;
  deleteObjects: (ids: string[]) => void;
  toggleGrid: () => void;
  setGridVisible: (visible: boolean) => void;
  setBackground: (config: BackgroundConfig) => void;
  triggerFocus: () => void;
  triggerResetCamera: () => void;
  triggerSnapToFloor: () => void;

  // Phase 3 Actions
  setTransformMode: (mode: TransformMode) => void;
  setIsGizmoDragging: (dragging: boolean) => void;
  updateSnap: (patch: Partial<SnapSettings>) => void;
  updateObjectTransform: (
    id: string,
    patch: Partial<Pick<SceneObject, 'position' | 'rotation' | 'scale'>>,
    recordUndo?: boolean
  ) => void;
  updateMultipleTransforms: (
    updates: { id: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] }[]
  ) => void;
  toggleMirror: (id: string, axis: 'x' | 'y' | 'z') => void;
  applyFloorOffset: (offsets: { id: string; deltaY: number }[]) => void;

  // History / Transactions
  beginTransaction: () => void;
  commitTransaction: () => void;
  undo: () => void;
  redo: () => void;
}

function cloneObjects(objs: SceneObject[]): SceneObject[] {
  return objs.map((o) => ({
    ...o,
    position: [...o.position],
    rotation: [...o.rotation],
    scale: [...o.scale]
  }));
}

function pushPast(past: SceneObject[][], snapshot: SceneObject[]): SceneObject[][] {
  const next = [...past, cloneObjects(snapshot)];
  if (next.length > MAX_HISTORY_DEPTH) {
    return next.slice(next.length - MAX_HISTORY_DEPTH);
  }
  return next;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  selectedObjectIds: [],
  hoveredObjectId: null,
  gridVisible: true,
  background: { type: 'color', color: '#1a1c23' },
  focusTargetTimestamp: 0,
  resetCameraTimestamp: 0,
  snapToFloorTimestamp: 0,

  transformMode: 'translate',
  isGizmoDragging: false,
  snap: {
    positionEnabled: false,
    positionValue: 0.5,
    rotationEnabled: false,
    rotationValue: 15,
    scaleEnabled: false,
    scaleValue: 0.1
  },

  past: [],
  future: [],
  transactionSnapshot: null,

  addObject: (modelId, modelName, position) => {
    const { objects, past } = get();
    const count = objects.filter((o) => o.modelId === modelId).length + 1;
    const name = count === 1 ? modelName : `${modelName} (${count})`;
    const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newObject: SceneObject = {
      id,
      modelId,
      name,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      locked: false,
      parentId: null
    };

    set({
      past: pushPast(past, objects),
      future: [],
      objects: [...objects, newObject],
      selectedObjectIds: [id]
    });

    return newObject;
  },

  selectObject: (id, multiSelect = false) => {
    const { objects, selectedObjectIds } = get();
    const target = objects.find((o) => o.id === id);
    if (!target || target.locked) return;

    if (multiSelect) {
      if (selectedObjectIds.includes(id)) {
        set({ selectedObjectIds: selectedObjectIds.filter((item) => item !== id) });
      } else {
        set({ selectedObjectIds: [...selectedObjectIds, id] });
      }
    } else {
      set({ selectedObjectIds: [id] });
    }
  },

  deselectAll: () => {
    if (get().selectedObjectIds.length > 0) {
      set({ selectedObjectIds: [] });
    }
  },

  setHoveredObjectId: (id) => {
    if (id) {
      const target = get().objects.find((o) => o.id === id);
      if (target?.locked) return;
    }
    set({ hoveredObjectId: id });
  },

  toggleVisibility: (id) => {
    const { objects, past } = get();
    set({
      past: pushPast(past, objects),
      future: [],
      objects: objects.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o))
    });
  },

  toggleLock: (id) => {
    const { objects, past, selectedObjectIds } = get();
    const isNowLocked = !objects.find((o) => o.id === id)?.locked;
    set({
      past: pushPast(past, objects),
      future: [],
      objects: objects.map((o) => (o.id === id ? { ...o, locked: isNowLocked } : o)),
      selectedObjectIds: isNowLocked
        ? selectedObjectIds.filter((item) => item !== id)
        : selectedObjectIds
    });
  },

  renameObject: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { objects, past } = get();
    const target = objects.find((o) => o.id === id);
    if (!target || target.name === trimmed) return;

    set({
      past: pushPast(past, objects),
      future: [],
      objects: objects.map((o) => (o.id === id ? { ...o, name: trimmed } : o))
    });
  },

  duplicateObject: (id) => {
    const { objects, past } = get();
    const original = objects.find((o) => o.id === id);
    if (!original) return null;

    const count = objects.filter((o) => o.modelId === original.modelId).length + 1;
    const newId = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duplicate: SceneObject = {
      ...original,
      id: newId,
      name: `${original.name.replace(/\s\(\d+\)$/, '')} (${count})`,
      position: [
        original.position[0] + 0.5,
        original.position[1],
        original.position[2] + 0.5
      ],
      rotation: [...original.rotation],
      scale: [...original.scale],
      locked: false
    };

    set({
      past: pushPast(past, objects),
      future: [],
      objects: [...objects, duplicate],
      selectedObjectIds: [newId]
    });

    return duplicate;
  },

  duplicateSelected: () => {
    const { objects, selectedObjectIds, past } = get();
    if (selectedObjectIds.length === 0) return;

    const newObjects: SceneObject[] = [];
    const newSelectedIds: string[] = [];
    let currentObjects = [...objects];

    for (const id of selectedObjectIds) {
      const original = currentObjects.find((o) => o.id === id);
      if (!original) continue;
      const count = currentObjects.filter((o) => o.modelId === original.modelId).length + 1;
      const newId = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const dup: SceneObject = {
        ...original,
        id: newId,
        name: `${original.name.replace(/\s\(\d+\)$/, '')} (${count})`,
        position: [
          original.position[0] + 0.5,
          original.position[1],
          original.position[2] + 0.5
        ],
        rotation: [...original.rotation],
        scale: [...original.scale],
        locked: false
      };
      newObjects.push(dup);
      currentObjects.push(dup);
      newSelectedIds.push(newId);
    }

    if (newObjects.length > 0) {
      set({
        past: pushPast(past, objects),
        future: [],
        objects: currentObjects,
        selectedObjectIds: newSelectedIds
      });
    }
  },

  deleteObjects: (ids) => {
    if (ids.length === 0) return;
    const { objects, past, selectedObjectIds, hoveredObjectId } = get();
    const idSet = new Set(ids);
    const remaining = objects.filter((o) => !idSet.has(o.id));
    if (remaining.length === objects.length) return;

    set({
      past: pushPast(past, objects),
      future: [],
      objects: remaining,
      selectedObjectIds: selectedObjectIds.filter((id) => !idSet.has(id)),
      hoveredObjectId: idSet.has(hoveredObjectId || '') ? null : hoveredObjectId
    });
  },

  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },

  setGridVisible: (visible) => {
    set({ gridVisible: visible });
  },

  setBackground: (config) => {
    set({ background: config });
  },

  triggerFocus: () => {
    set({ focusTargetTimestamp: Date.now() });
  },

  triggerResetCamera: () => {
    set({ resetCameraTimestamp: Date.now() });
  },

  triggerSnapToFloor: () => {
    set({ snapToFloorTimestamp: Date.now() });
  },

  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },

  setIsGizmoDragging: (dragging) => {
    set({ isGizmoDragging: dragging });
  },

  updateSnap: (patch) => {
    set((state) => ({ snap: { ...state.snap, ...patch } }));
  },

  updateObjectTransform: (id, patch, recordUndo = false) => {
    const { objects, past } = get();
    const updated = objects.map((o) => (o.id === id ? { ...o, ...patch } : o));
    if (recordUndo) {
      set({
        past: pushPast(past, objects),
        future: [],
        objects: updated
      });
    } else {
      set({ objects: updated });
    }
  },

  updateMultipleTransforms: (updates) => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    set((state) => ({
      objects: state.objects.map((o) => {
        const u = updateMap.get(o.id);
        if (!u) return o;
        return {
          ...o,
          position: u.position ?? o.position,
          rotation: u.rotation ?? o.rotation,
          scale: u.scale ?? o.scale
        };
      })
    }));
  },

  toggleMirror: (id, axis) => {
    const { objects, past } = get();
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    set({
      past: pushPast(past, objects),
      future: [],
      objects: objects.map((o) => {
        if (o.id !== id) return o;
        const nextScale: [number, number, number] = [...o.scale];
        nextScale[idx] = -nextScale[idx];
        return { ...o, scale: nextScale };
      })
    });
  },

  applyFloorOffset: (offsets) => {
    if (offsets.length === 0) return;
    const { objects, past } = get();
    const map = new Map(offsets.map((item) => [item.id, item.deltaY]));
    set({
      past: pushPast(past, objects),
      future: [],
      objects: objects.map((o) => {
        const dy = map.get(o.id);
        if (dy === undefined || Math.abs(dy) < 1e-5) return o;
        return {
          ...o,
          position: [o.position[0], o.position[1] + dy, o.position[2]]
        };
      })
    });
  },

  beginTransaction: () => {
    if (get().transactionSnapshot === null) {
      set({ transactionSnapshot: cloneObjects(get().objects) });
    }
  },

  commitTransaction: () => {
    const { transactionSnapshot, objects, past } = get();
    if (!transactionSnapshot) return;
    // Check if objects actually changed
    const changed = JSON.stringify(transactionSnapshot) !== JSON.stringify(objects);
    if (changed) {
      set({
        past: pushPast(past, transactionSnapshot),
        future: [],
        transactionSnapshot: null
      });
    } else {
      set({ transactionSnapshot: null });
    }
  },

  undo: () => {
    const { past, future, objects, selectedObjectIds } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const nextPast = past.slice(0, -1);
    const validIds = new Set(previous.map((o) => o.id));

    set({
      past: nextPast,
      future: [cloneObjects(objects), ...future].slice(0, MAX_HISTORY_DEPTH),
      objects: cloneObjects(previous),
      selectedObjectIds: selectedObjectIds.filter((id) => validIds.has(id)),
      transactionSnapshot: null
    });
  },

  redo: () => {
    const { past, future, objects, selectedObjectIds } = get();
    if (future.length === 0) return;

    const next = future[0];
    const nextFuture = future.slice(1);
    const validIds = new Set(next.map((o) => o.id));

    set({
      past: pushPast(past, objects),
      future: nextFuture,
      objects: cloneObjects(next),
      selectedObjectIds: selectedObjectIds.filter((id) => validIds.has(id)),
      transactionSnapshot: null
    });
  }
}));
