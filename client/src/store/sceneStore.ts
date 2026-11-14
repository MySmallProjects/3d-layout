import { create } from 'zustand';
import { SceneObject, BackgroundConfig } from '../types';

interface SceneState {
  objects: SceneObject[];
  selectedObjectIds: string[];
  hoveredObjectId: string | null;
  gridVisible: boolean;
  background: BackgroundConfig;
  focusTargetTimestamp: number;
  resetCameraTimestamp: number;

  // Actions
  addObject: (modelId: string, modelName: string, position: [number, number, number]) => SceneObject;
  selectObject: (id: string, multiSelect?: boolean) => void;
  deselectAll: () => void;
  setHoveredObjectId: (id: string | null) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  renameObject: (id: string, name: string) => void;
  duplicateObject: (id: string) => SceneObject | null;
  deleteObjects: (ids: string[]) => void;
  toggleGrid: () => void;
  setGridVisible: (visible: boolean) => void;
  setBackground: (config: BackgroundConfig) => void;
  triggerFocus: () => void;
  triggerResetCamera: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: [],
  selectedObjectIds: [],
  hoveredObjectId: null,
  gridVisible: true,
  background: { type: 'color', color: '#1a1c23' },
  focusTargetTimestamp: 0,
  resetCameraTimestamp: 0,

  addObject: (modelId, modelName, position) => {
    const { objects } = get();
    // Count existing instances of this model to generate friendly name
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
      objects: [...objects, newObject],
      selectedObjectIds: [id] // auto-select newly placed object
    });

    return newObject;
  },

  selectObject: (id, multiSelect = false) => {
    const { objects, selectedObjectIds } = get();
    const target = objects.find((o) => o.id === id);
    if (!target || target.locked) return; // Cannot select locked objects

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
      if (target?.locked) return; // Ignore hover on locked objects
    }
    set({ hoveredObjectId: id });
  },

  toggleVisibility: (id) => {
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, visible: !o.visible } : o
      )
    }));
  },

  toggleLock: (id) => {
    set((state) => {
      const isNowLocked = !state.objects.find((o) => o.id === id)?.locked;
      return {
        objects: state.objects.map((o) =>
          o.id === id ? { ...o, locked: isNowLocked } : o
        ),
        // If locking, remove from selection
        selectedObjectIds: isNowLocked
          ? state.selectedObjectIds.filter((item) => item !== id)
          : state.selectedObjectIds
      };
    });
  },

  renameObject: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? { ...o, name: trimmed } : o
      )
    }));
  },

  duplicateObject: (id) => {
    const { objects } = get();
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
      locked: false // Duplicates are unlocked by default
    };

    set({
      objects: [...objects, duplicate],
      selectedObjectIds: [newId]
    });

    return duplicate;
  },

  deleteObjects: (ids) => {
    const idSet = new Set(ids);
    set((state) => ({
      objects: state.objects.filter((o) => !idSet.has(o.id)),
      selectedObjectIds: state.selectedObjectIds.filter((id) => !idSet.has(id)),
      hoveredObjectId: idSet.has(state.hoveredObjectId || '') ? null : state.hoveredObjectId
    }));
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
  }
}));
