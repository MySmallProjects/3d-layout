import { create } from 'zustand';
import { AppSettings, DEFAULT_APP_SETTINGS, Folder, FolderNode, LibraryModel, ModelNormalisation } from '../types';
import {
  fetchFolders,
  createFolderApi,
  renameFolderApi,
  deleteFolderApi
} from '../api/folders';
import {
  fetchModels,
  uploadModelsApi,
  renameModelApi,
  moveModelApi,
  deleteModelApi,
  uploadThumbnailApi,
  updateModelNormalisationApi,
  optimiseModelApi,
  revertModelApi,
  updateModelTagsApi,
  markModelUsedApi
} from '../api/models';
import { fetchAppSettings, updateAppSettingsApi } from '../api/settings';
import { generateThumbnailDataUrl } from '../services/thumbnailGenerator';
import { computeModelNormalisationFromUrl } from '../utils/modelNormalisation';
import { invalidateGltfCache } from '../components/viewport/SceneObjectRenderer';

interface LibraryState {
  models: LibraryModel[];
  folders: Folder[];
  folderTree: FolderNode[];
  selectedFolderId: string | null | undefined; // undefined = all, null = uncategorized/root
  searchQuery: string;
  selectedTag: string | null;
  isLoading: boolean;
  uploadProgress: { total: number; completed: number; currentName?: string } | null;
  generatingThumbnails: Record<string, boolean>;
  optimisingModels: Record<string, boolean>;
  appSettings: AppSettings;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  loadLibrary: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  setSelectedFolder: (folderId: string | null | undefined) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string | null) => void;
  createFolder: (name: string, parentId?: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string, deleteContents?: boolean) => Promise<void>;
  uploadFiles: (files: File[], folderId?: string | null) => Promise<void>;
  renameModel: (id: string, name: string) => Promise<void>;
  moveModel: (id: string, folderId: string | null) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  regenerateThumbnail: (id: string) => Promise<void>;
  updateModelNormalisation: (id: string, norm: ModelNormalisation | null) => Promise<LibraryModel>;
  renormaliseModel: (id: string, targetSizeOverride?: number, enabledOverride?: boolean) => Promise<LibraryModel>;
  optimiseModel: (id: string, options?: { maxTextureSize?: number; webpQuality?: number }) => Promise<LibraryModel>;
  revertModel: (id: string) => Promise<LibraryModel>;
  updateModelTags: (id: string, tags: string[]) => Promise<LibraryModel>;
  markModelUsed: (id: string) => Promise<void>;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearToast: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  models: [],
  folders: [],
  folderTree: [],
  selectedFolderId: undefined, // default: show all models
  searchQuery: '',
  selectedTag: null,
  isLoading: false,
  uploadProgress: null,
  generatingThumbnails: {},
  optimisingModels: {},
  appSettings: DEFAULT_APP_SETTINGS,
  toast: null,

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
  },

  clearToast: () => set({ toast: null }),

  setSelectedFolder: (folderId) => {
    set({ selectedFolderId: folderId });
    get().loadLibrary();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().loadLibrary();
  },

  setSelectedTag: (tag) => {
    set({ selectedTag: tag });
  },

  updateModelTags: async (id, tags) => {
    const updated = await updateModelTagsApi(id, tags);
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? updated : m))
    }));
    return updated;
  },

  markModelUsed: async (id) => {
    try {
      const updated = await markModelUsedApi(id);
      set((state) => ({
        models: state.models.map((m) => (m.id === id ? updated : m))
      }));
    } catch {
      // Ignore non-critical tracking errors
    }
  },

  loadLibrary: async () => {
    const { selectedFolderId, searchQuery } = get();
    set({ isLoading: true });
    try {
      const [foldersRes, modelsRes, settingsRes] = await Promise.all([
        fetchFolders(),
        fetchModels(selectedFolderId, searchQuery),
        fetchAppSettings().catch(() => get().appSettings)
      ]);
      set({
        folders: foldersRes.folders,
        folderTree: foldersRes.tree,
        models: modelsRes.models,
        appSettings: settingsRes,
        isLoading: false
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load library';
      set({ isLoading: false });
      get().showToast(message, 'error');
    }
  },

  loadSettings: async () => {
    const settings = await fetchAppSettings();
    set({ appSettings: settings });
  },

  saveSettings: async (patch) => {
    const updated = await updateAppSettingsApi(patch);
    set({ appSettings: updated });
    return updated;
  },

  createFolder: async (name, parentId = null) => {
    try {
      await createFolderApi(name, parentId);
      await get().loadLibrary();
      get().showToast(`Folder "${name}" created`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create folder';
      get().showToast(message, 'error');
      throw err;
    }
  },

  renameFolder: async (id, name) => {
    try {
      await renameFolderApi(id, name);
      await get().loadLibrary();
      get().showToast(`Folder renamed to "${name}"`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to rename folder';
      get().showToast(message, 'error');
      throw err;
    }
  },

  deleteFolder: async (id, deleteContents = false) => {
    try {
      await deleteFolderApi(id, deleteContents);
      const { selectedFolderId } = get();
      if (selectedFolderId === id) {
        set({ selectedFolderId: undefined });
      }
      await get().loadLibrary();
      get().showToast('Folder deleted', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder';
      get().showToast(message, 'error');
      throw err;
    }
  },

  uploadFiles: async (files, folderId = null) => {
    if (!files.length) return;
    const targetFolder = folderId !== undefined ? folderId : (get().selectedFolderId || null);

    set({ uploadProgress: { total: files.length, completed: 0 } });
    try {
      const res = await uploadModelsApi(files, targetFolder);
      set({ uploadProgress: null });
      get().showToast(`Uploaded ${res.models.length} model(s)`, 'success');

      // Reload to show new models immediately
      await get().loadLibrary();

      // Trigger client-side offscreen thumbnail rendering + import normalisation for newly uploaded models
      const normCfg = get().appSettings.normalization;
      for (const m of res.models) {
        get().regenerateThumbnail(m.id).catch((e) => {
          console.warn(`Auto-thumbnail failed for model ${m.name}:`, e);
        });
        get()
          .renormaliseModel(m.id, normCfg.defaultTargetSize, normCfg.enabledByDefault)
          .catch((e) => {
            console.warn(`Auto-normalisation failed for model ${m.name}:`, e);
          });
      }
    } catch (err: unknown) {
      set({ uploadProgress: null });
      const message = err instanceof Error ? err.message : 'Upload failed';
      get().showToast(message, 'error');
    }
  },

  regenerateThumbnail: async (id: string) => {
    set((state) => ({
      generatingThumbnails: { ...state.generatingThumbnails, [id]: true }
    }));

    try {
      const fileUrl = `/api/models/${id}/file`;
      const dataUrl = await generateThumbnailDataUrl(fileUrl);
      await uploadThumbnailApi(id, dataUrl);

      // Update model record in local state
      set((state) => ({
        models: state.models.map((m) =>
          m.id === id ? { ...m, thumbnailPath: `thumbnails/${id}.png?t=${Date.now()}` } : m
        ),
        generatingThumbnails: { ...state.generatingThumbnails, [id]: false }
      }));
    } catch (err: unknown) {
      console.error('Thumbnail generation error:', err);
      set((state) => ({
        generatingThumbnails: { ...state.generatingThumbnails, [id]: false }
      }));
      get().showToast('Failed to generate thumbnail for model', 'error');
    }
  },

  renameModel: async (id, name) => {
    try {
      await renameModelApi(id, name);
      await get().loadLibrary();
      get().showToast(`Model renamed to "${name}"`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to rename model';
      get().showToast(message, 'error');
    }
  },

  moveModel: async (id, folderId) => {
    try {
      await moveModelApi(id, folderId);
      await get().loadLibrary();
      get().showToast('Model moved', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to move model';
      get().showToast(message, 'error');
    }
  },

  deleteModel: async (id) => {
    try {
      await deleteModelApi(id);
      invalidateGltfCache(id);
      await get().loadLibrary();
      get().showToast('Model deleted', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete model';
      get().showToast(message, 'error');
    }
  },

  updateModelNormalisation: async (id, norm) => {
    const updated = await updateModelNormalisationApi(id, norm);
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? updated : m))
    }));
    return updated;
  },

  renormaliseModel: async (id, targetSizeOverride, enabledOverride) => {
    const existing = get().models.find((m) => m.id === id);
    const defaultSize = get().appSettings.normalization.defaultTargetSize;
    const targetSize = targetSizeOverride ?? existing?.normalisation?.targetSize ?? defaultSize;
    const enabled = enabledOverride ?? true;
    const computed = await computeModelNormalisationFromUrl(
      `/api/models/${id}/file`,
      targetSize,
      enabled
    );
    return get().updateModelNormalisation(id, computed);
  },

  optimiseModel: async (id, options) => {
    set((s) => ({ optimisingModels: { ...s.optimisingModels, [id]: true } }));
    try {
      const updated = await optimiseModelApi(id, options);
      invalidateGltfCache(id);
      set((s) => ({ models: s.models.map((m) => (m.id === id ? updated : m)) }));
      return updated;
    } finally {
      set((s) => {
        const next = { ...s.optimisingModels };
        delete next[id];
        return { optimisingModels: next };
      });
    }
  },

  revertModel: async (id) => {
    set((s) => ({ optimisingModels: { ...s.optimisingModels, [id]: true } }));
    try {
      const updated = await revertModelApi(id);
      invalidateGltfCache(id);
      set((s) => ({ models: s.models.map((m) => (m.id === id ? updated : m)) }));
      return updated;
    } finally {
      set((s) => {
        const next = { ...s.optimisingModels };
        delete next[id];
        return { optimisingModels: next };
      });
    }
  }
}));
