import { create } from 'zustand';
import { SceneObject, BackgroundConfig } from '../types';
import type { AppliedNormalisation, CameraBookmark, CameraState, SceneData } from '@shared/types/scene';
import type { LightingConfig } from '@shared/types/lighting';
import type { RenderSettings } from '@shared/types/render';
import { DEFAULT_LIGHTING_CONFIG, DEFAULT_RENDER_SETTINGS } from '../constants/lightingPresets';

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

  // Scene Metadata & Persistence (Phase 4)
  currentSceneId: string | null;
  currentSceneName: string;
  isDirty: boolean;
  cameraState: CameraState;
  pendingCameraRestoreTimestamp: number;

  // Lighting & Render Settings (Phase 6)
  lighting: LightingConfig;
  renderSettings: RenderSettings;

  // Camera Bookmarks (Phase 7.3)
  cameraBookmarks: CameraBookmark[];

  // Transform & Snapping
  transformMode: TransformMode;
  isGizmoDragging: boolean;
  snap: SnapSettings;

  // Undo / Redo History
  past: SceneObject[][];
  future: SceneObject[][];
  transactionSnapshot: SceneObject[] | null;

  // Actions
  addObject: (
    modelId: string,
    modelName: string,
    position: [number, number, number],
    appliedNormalisation?: AppliedNormalisation | null
  ) => SceneObject;
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

  // Scene Persistence (Phase 4)
  setCameraState: (camera: CameraState) => void;
  loadSceneData: (data: SceneData, meta: { id: string | null; name: string }, isDirty?: boolean) => void;
  resetScene: () => void;
  setSceneMeta: (meta: { id?: string | null; name?: string }) => void;
  markClean: () => void;
  serializeScene: (cameraOverride?: CameraState) => SceneData;

  // Lighting & Render Settings (Phase 6)
  setLighting: (lighting: LightingConfig) => void;
  setRenderSettings: (patch: Partial<RenderSettings>) => void;

  // Camera Bookmarks (Phase 7.3)
  addCameraBookmark: (name?: string, cameraOverride?: CameraState) => CameraBookmark;
  jumpToCameraBookmark: (id: string) => void;
  renameCameraBookmark: (id: string, name: string) => void;
  updateCameraBookmarkFromCurrent: (id: string, cameraOverride?: CameraState) => void;
  deleteCameraBookmark: (id: string) => void;
}

function getLiveCameraState(fallback: CameraState): CameraState {
  const getter = (window as unknown as { __getCameraState?: () => CameraState }).__getCameraState;
  const cam = getter ? getter() : fallback;
  return {
    position: [...cam.position],
    target: [...cam.target]
  };
}

function cloneBookmarks(bookmarks: CameraBookmark[] | undefined): CameraBookmark[] {
  if (!Array.isArray(bookmarks)) return [];
  return bookmarks.map((b) => ({
    ...b,
    camera: {
      position: [...b.camera.position] as [number, number, number],
      target: [...b.camera.target] as [number, number, number]
    }
  }));
}

function cloneObjects(objs: SceneObject[]): SceneObject[] {
  return objs.map((o) => ({
    ...o,
    position: [...o.position],
    rotation: [...o.rotation],
    scale: [...o.scale],
    appliedNormalisation: o.appliedNormalisation
      ? {
          scaleFactor: o.appliedNormalisation.scaleFactor,
          pivotOffset: [...o.appliedNormalisation.pivotOffset],
        }
      : o.appliedNormalisation,
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

  currentSceneId: null,
  currentSceneName: 'Untitled Scene',
  isDirty: false,
  cameraState: { position: [8, 6, 8], target: [0, 0, 0] },
  pendingCameraRestoreTimestamp: 0,

  lighting: DEFAULT_LIGHTING_CONFIG,
  renderSettings: DEFAULT_RENDER_SETTINGS,
  cameraBookmarks: [],

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

  addObject: (modelId, modelName, position, appliedNormalisation = null) => {
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
      parentId: null,
      appliedNormalisation: appliedNormalisation
        ? {
            scaleFactor: appliedNormalisation.scaleFactor,
            pivotOffset: [...appliedNormalisation.pivotOffset],
          }
        : null,
    };

    set({
      past: pushPast(past, objects),
      future: [],
      objects: [...objects, newObject],
      selectedObjectIds: [id],
      isDirty: true
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
      objects: objects.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)),
      isDirty: true
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
        : selectedObjectIds,
      isDirty: true
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
      objects: objects.map((o) => (o.id === id ? { ...o, name: trimmed } : o)),
      isDirty: true
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
      selectedObjectIds: [newId],
      isDirty: true
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
        selectedObjectIds: newSelectedIds,
        isDirty: true
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
      hoveredObjectId: idSet.has(hoveredObjectId || '') ? null : hoveredObjectId,
      isDirty: true
    });
  },

  toggleGrid: () => {
    set((state) => ({ gridVisible: !state.gridVisible, isDirty: true }));
  },

  setGridVisible: (visible) => {
    set({ gridVisible: visible, isDirty: true });
  },

  setBackground: (config) => {
    set({ background: config, isDirty: true });
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
        objects: updated,
        isDirty: true
      });
    } else {
      set({ objects: updated, isDirty: true });
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
      }),
      isDirty: true
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
      }),
      isDirty: true
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
      }),
      isDirty: true
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
        transactionSnapshot: null,
        isDirty: true
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
      transactionSnapshot: null,
      isDirty: true
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
      transactionSnapshot: null,
      isDirty: true
    });
  },

  setCameraState: (camera) => {
    set({ cameraState: camera });
  },

  loadSceneData: (data, meta, isDirty = false) => {
    const loadedLighting =
      data.lighting && typeof (data.lighting as unknown as LightingConfig).presetId === 'string'
        ? (data.lighting as unknown as LightingConfig)
        : DEFAULT_LIGHTING_CONFIG;
    const loadedRender =
      data.renderSettings && typeof (data.renderSettings as unknown as RenderSettings).width === 'number'
        ? { ...(data.renderSettings as unknown as RenderSettings), lighting: loadedLighting }
        : { ...DEFAULT_RENDER_SETTINGS, lighting: loadedLighting };

    set({
      objects: cloneObjects(data.objects || []),
      gridVisible: data.gridVisible ?? true,
      background: data.background || { type: 'color', color: '#1a1c23' },
      cameraState: data.camera || { position: [8, 6, 8], target: [0, 0, 0] },
      lighting: loadedLighting,
      renderSettings: loadedRender,
      cameraBookmarks: cloneBookmarks(data.cameraBookmarks),
      pendingCameraRestoreTimestamp: Date.now(),
      selectedObjectIds: [],
      hoveredObjectId: null,
      past: [],
      future: [],
      transactionSnapshot: null,
      currentSceneId: meta.id,
      currentSceneName: meta.name,
      isDirty
    });
  },

  resetScene: () => {
    set({
      objects: [],
      selectedObjectIds: [],
      hoveredObjectId: null,
      gridVisible: true,
      background: { type: 'color', color: '#1a1c23' },
      cameraState: { position: [8, 6, 8], target: [0, 0, 0] },
      lighting: DEFAULT_LIGHTING_CONFIG,
      renderSettings: DEFAULT_RENDER_SETTINGS,
      cameraBookmarks: [],
      pendingCameraRestoreTimestamp: Date.now(),
      past: [],
      future: [],
      transactionSnapshot: null,
      currentSceneId: null,
      currentSceneName: 'Untitled Scene',
      isDirty: false
    });
  },

  setSceneMeta: (meta) => {
    set((state) => ({
      currentSceneId: meta.id !== undefined ? meta.id : state.currentSceneId,
      currentSceneName: meta.name !== undefined ? meta.name : state.currentSceneName
    }));
  },

  markClean: () => {
    set({ isDirty: false });
  },

  serializeScene: (cameraOverride) => {
    const { objects, gridVisible, background, cameraState, lighting, renderSettings, cameraBookmarks } = get();
    return {
      schemaVersion: 1,
      objects: cloneObjects(objects),
      gridVisible,
      background,
      camera: cameraOverride ?? cameraState,
      lighting: lighting as unknown as Record<string, unknown>,
      renderSettings: renderSettings as unknown as Record<string, unknown>,
      groundPlane: {},
      cameraBookmarks: cloneBookmarks(cameraBookmarks)
    };
  },

  setLighting: (lighting) => {
    set((state) => ({
      lighting,
      renderSettings: { ...state.renderSettings, lighting },
      isDirty: true
    }));
  },

  setRenderSettings: (patch) => {
    set((state) => ({
      renderSettings: { ...state.renderSettings, ...patch },
      isDirty: true
    }));
  },

  addCameraBookmark: (name, cameraOverride) => {
    const { cameraBookmarks, cameraState } = get();
    const liveCam = cameraOverride ?? getLiveCameraState(cameraState);
    const trimmed = name?.trim();
    const bookmark: CameraBookmark = {
      id: `cam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed || `Camera ${cameraBookmarks.length + 1}`,
      camera: {
        position: [...liveCam.position],
        target: [...liveCam.target]
      },
      createdAt: new Date().toISOString()
    };
    set({
      cameraBookmarks: [...cameraBookmarks, bookmark],
      cameraState: liveCam,
      isDirty: true
    });
    return bookmark;
  },

  jumpToCameraBookmark: (id) => {
    const bookmark = get().cameraBookmarks.find((b) => b.id === id);
    if (!bookmark) return;
    set((state) => ({
      cameraState: {
        position: [...bookmark.camera.position],
        target: [...bookmark.camera.target]
      },
      pendingCameraRestoreTimestamp: Math.max(Date.now(), state.pendingCameraRestoreTimestamp + 1)
    }));
  },

  renameCameraBookmark: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      cameraBookmarks: state.cameraBookmarks.map((b) =>
        b.id === id ? { ...b, name: trimmed } : b
      ),
      isDirty: true
    }));
  },

  updateCameraBookmarkFromCurrent: (id, cameraOverride) => {
    const { cameraState } = get();
    const liveCam = cameraOverride ?? getLiveCameraState(cameraState);
    set((state) => ({
      cameraBookmarks: state.cameraBookmarks.map((b) =>
        b.id === id
          ? {
              ...b,
              camera: {
                position: [...liveCam.position],
                target: [...liveCam.target]
              }
            }
          : b
      ),
      cameraState: liveCam,
      isDirty: true
    }));
  },

  deleteCameraBookmark: (id) => {
    set((state) => ({
      cameraBookmarks: state.cameraBookmarks.filter((b) => b.id !== id),
      isDirty: true
    }));
  }
}));
