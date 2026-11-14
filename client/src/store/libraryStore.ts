import { create } from 'zustand';
import { Folder, FolderNode, LibraryModel } from '../types';
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
  uploadThumbnailApi
} from '../api/models';
import { generateThumbnailDataUrl } from '../services/thumbnailGenerator';

interface LibraryState {
  models: LibraryModel[];
  folders: Folder[];
  folderTree: FolderNode[];
  selectedFolderId: string | null | undefined; // undefined = all, null = uncategorized/root
  searchQuery: string;
  isLoading: boolean;
  uploadProgress: { total: number; completed: number; currentName?: string } | null;
  generatingThumbnails: Record<string, boolean>;
  toast: { message: string; type: 'info' | 'success' | 'error' } | null;

  // Actions
  loadLibrary: () => Promise<void>;
  setSelectedFolder: (folderId: string | null | undefined) => void;
  setSearchQuery: (query: string) => void;
  createFolder: (name: string, parentId?: string | null) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string, deleteContents?: boolean) => Promise<void>;
  uploadFiles: (files: File[], folderId?: string | null) => Promise<void>;
  renameModel: (id: string, name: string) => Promise<void>;
  moveModel: (id: string, folderId: string | null) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  regenerateThumbnail: (id: string) => Promise<void>;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearToast: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  models: [],
  folders: [],
  folderTree: [],
  selectedFolderId: undefined, // default: show all models
  searchQuery: '',
  isLoading: false,
  uploadProgress: null,
  generatingThumbnails: {},
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

  loadLibrary: async () => {
    const { selectedFolderId, searchQuery } = get();
    set({ isLoading: true });
    try {
      const [foldersRes, modelsRes] = await Promise.all([
        fetchFolders(),
        fetchModels(selectedFolderId, searchQuery)
      ]);
      set({
        folders: foldersRes.folders,
        folderTree: foldersRes.tree,
        models: modelsRes.models,
        isLoading: false
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load library';
      set({ isLoading: false });
      get().showToast(message, 'error');
    }
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

      // Trigger client-side offscreen thumbnail rendering for newly uploaded models
      for (const m of res.models) {
        get().regenerateThumbnail(m.id).catch((e) => {
          console.warn(`Auto-thumbnail failed for model ${m.name}:`, e);
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
      await get().loadLibrary();
      get().showToast('Model deleted', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete model';
      get().showToast(message, 'error');
    }
  }
}));
