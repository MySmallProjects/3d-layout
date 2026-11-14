import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SceneDraft } from '@shared/types/scene';
import { TopToolbar } from './components/layout/TopToolbar';
import { VersionBadge } from './components/layout/VersionBadge';
import { HelpModal } from './components/layout/HelpModal';
import { AboutModal } from './components/layout/AboutModal';
import { AdminPage } from './components/admin/AdminPage';
import { getVersionInfo } from './utils/version';
import { LibraryPanel } from './components/library/LibraryPanel';
import { Viewport } from './components/viewport/Viewport';
import { SceneObjectsPanel } from './components/scene/SceneObjectsPanel';
import { ScenesModal } from './components/scene/ScenesModal';
import { SaveAsModal } from './components/scene/SaveAsModal';
import { DraftRecoveryModal } from './components/scene/DraftRecoveryModal';
import { Toast } from './components/common/Toast';
import { useLibraryStore } from './store/libraryStore';
import { useSceneStore } from './store/sceneStore';
import { matchShortcutAction } from './constants/shortcuts';
import {
  clearDraftApi,
  createSceneApi,
  fetchDraftApi,
  fetchScene,
  saveDraftApi,
  updateSceneApi,
} from './api/scenes';
import {
  captureLiveSceneData,
  captureViewportThumbnail,
  exportSceneJson,
  validateAndNormalizeSceneJson,
} from './utils/sceneSerialization';

export const App: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.pathname === '/admin');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isScenesOpen, setIsScenesOpen] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<SceneDraft | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { loadLibrary, showToast } = useLibraryStore();
  const currentSceneId = useSceneStore((s) => s.currentSceneId);
  const currentSceneName = useSceneStore((s) => s.currentSceneName);
  const { versionDisplay, buildDateFormatted } = getVersionInfo();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    const onPopState = () => setIsAdminRoute(window.location.pathname === '/admin');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToAdmin = useCallback(() => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    setIsAdminRoute(true);
  }, []);

  const navigateToEditor = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setIsAdminRoute(false);
    loadLibrary();
  }, [loadLibrary]);

  // Check for autosaved draft on startup
  useEffect(() => {
    fetchDraftApi()
      .then((draft) => {
        if (draft) {
          setPendingDraft(draft);
        }
      })
      .catch(() => {
        // Ignore draft check failures on startup
      });
  }, []);

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!useSceneStore.getState().isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Autosave draft every 30 seconds when dirty
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useSceneStore.getState();
      if (!state.isDirty) return;
      const data = captureLiveSceneData();
      saveDraftApi(state.currentSceneId, state.currentSceneName, data).catch(() => {
        // Silent background autosave
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (!useSceneStore.getState().isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them and continue?');
  }, []);

  const handleSaveScene = useCallback(async () => {
    const state = useSceneStore.getState();
    if (!state.currentSceneId) {
      setIsSaveAsOpen(true);
      return;
    }
    try {
      const data = captureLiveSceneData();
      const thumb = captureViewportThumbnail();
      await updateSceneApi(state.currentSceneId, {
        name: state.currentSceneName,
        data,
        thumbnailDataUrl: thumb,
      });
      state.markClean();
      clearDraftApi().catch(() => {});
      showToast(`Saved "${state.currentSceneName}"`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save scene', 'error');
    }
  }, [showToast]);

  const handleSaveAsConfirm = useCallback(
    async (name: string) => {
      const data = captureLiveSceneData();
      const thumb = captureViewportThumbnail();
      const created = await createSceneApi(name, data, thumb);
      const state = useSceneStore.getState();
      state.setSceneMeta({ id: created.id, name: created.name });
      state.markClean();
      clearDraftApi().catch(() => {});
      showToast(`Saved "${created.name}"`, 'success');
    },
    [showToast]
  );

  const handleOpenScene = useCallback(
    async (id: string) => {
      if (!confirmDiscardIfDirty()) return;
      try {
        const record = await fetchScene(id);
        useSceneStore
          .getState()
          .loadSceneData(record.data, { id: record.id, name: record.name }, false);
        setIsScenesOpen(false);
        clearDraftApi().catch(() => {});

        const knownIds = new Set(useLibraryStore.getState().models.map((m) => m.id));
        const missingCount = record.data.objects.filter((o) => !knownIds.has(o.modelId)).length;
        if (missingCount > 0) {
          showToast(
            `Loaded "${record.name}" (${missingCount} object(s) reference missing library models)`,
            'info'
          );
        } else {
          showToast(`Loaded "${record.name}"`, 'success');
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to open scene', 'error');
      }
    },
    [confirmDiscardIfDirty, showToast]
  );

  const handleNewScene = useCallback(() => {
    if (!confirmDiscardIfDirty()) return;
    useSceneStore.getState().resetScene();
    clearDraftApi().catch(() => {});
    showToast('Started new scene', 'info');
  }, [confirmDiscardIfDirty, showToast]);

  const handleExportScene = useCallback(() => {
    const state = useSceneStore.getState();
    const data = captureLiveSceneData();
    exportSceneJson(state.currentSceneName, data);
    showToast('Exported scene JSON', 'success');
  }, [showToast]);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!confirmDiscardIfDirty()) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const knownIds = new Set(useLibraryStore.getState().models.map((m) => m.id));
        const { data, warnings } = validateAndNormalizeSceneJson(parsed, knownIds);
        const baseName = file.name.replace(/\.scene\.json$/i, '').replace(/\.json$/i, '') || 'Imported Scene';
        useSceneStore.getState().loadSceneData(data, { id: null, name: baseName }, true);
        if (warnings.length > 0) {
          showToast(`Imported "${baseName}": ${warnings[0]}`, 'info');
        } else {
          showToast(`Imported "${baseName}"`, 'success');
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Invalid scene JSON file', 'error');
      }
    },
    [confirmDiscardIfDirty, showToast]
  );

  // Global Keyboard Shortcuts (driven by single source of truth in constants/shortcuts.ts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = (activeEl?.tagName || '').toLowerCase();
      const isInputActive =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        activeEl?.isContentEditable;

      if (isInputActive) return;

      const action = matchShortcutAction(e);
      if (!action) return;

      const sceneState = useSceneStore.getState();

      switch (action) {
        case 'help':
          setIsHelpOpen((prev) => !prev);
          break;
        case 'toggleGrid':
          sceneState.toggleGrid();
          break;
        case 'focus':
          sceneState.triggerFocus();
          break;
        case 'resetView':
          sceneState.triggerResetCamera();
          break;
        case 'deselect':
          sceneState.deselectAll();
          break;
        case 'delete':
          if (sceneState.selectedObjectIds.length > 0) {
            sceneState.deleteObjects(sceneState.selectedObjectIds);
          }
          break;
        case 'duplicate':
          e.preventDefault();
          sceneState.duplicateSelected();
          break;
        case 'modeTranslate':
          sceneState.setTransformMode('translate');
          break;
        case 'modeRotate':
          sceneState.setTransformMode('rotate');
          break;
        case 'modeScale':
          sceneState.setTransformMode('scale');
          break;
        case 'undo':
          e.preventDefault();
          sceneState.undo();
          break;
        case 'redo':
          e.preventDefault();
          sceneState.redo();
          break;
        case 'save':
          e.preventDefault();
          handleSaveScene();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveScene]);

  if (isAdminRoute) {
    return <AdminPage onBackToEditor={navigateToEditor} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Hidden JSON import input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {/* Top Toolbar */}
      <TopToolbar
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={navigateToAdmin}
        onOpenAbout={() => setIsAboutOpen(true)}
        onNewScene={handleNewScene}
        onOpenScenesModal={() => setIsScenesOpen(true)}
        onSaveScene={handleSaveScene}
        onSaveSceneAs={() => setIsSaveAsOpen(true)}
        onExportScene={handleExportScene}
        onImportScene={() => importInputRef.current?.click()}
      />

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left: Asset Library Panel */}
        <LibraryPanel />

        {/* Center: 3D Viewport */}
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-app)',
            position: 'relative',
            minWidth: 0
          }}
        >
          <Viewport />
        </main>

        {/* Right: Scene Objects List & Properties Panel */}
        <SceneObjectsPanel />
      </div>

      {/* Version badge (bottom left) */}
      <VersionBadge onOpenAbout={() => setIsAboutOpen(true)} />

      {/* Modals & Toasts */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={navigateToAdmin}
        versionDisplay={versionDisplay}
        buildDate={buildDateFormatted}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ScenesModal
        isOpen={isScenesOpen}
        onClose={() => setIsScenesOpen(false)}
        currentSceneId={currentSceneId}
        onOpenScene={handleOpenScene}
        onRenamedCurrentScene={(_id, newName) =>
          useSceneStore.getState().setSceneMeta({ name: newName })
        }
      />
      <SaveAsModal
        isOpen={isSaveAsOpen}
        initialName={currentSceneName}
        onClose={() => setIsSaveAsOpen(false)}
        onConfirm={handleSaveAsConfirm}
      />
      <DraftRecoveryModal
        draft={pendingDraft}
        onRecover={() => {
          if (!pendingDraft) return;
          useSceneStore.getState().loadSceneData(
            pendingDraft.data,
            { id: pendingDraft.sceneId, name: pendingDraft.sceneName },
            true
          );
          setPendingDraft(null);
          showToast('Recovered autosaved draft', 'info');
        }}
        onDiscard={() => {
          setPendingDraft(null);
          clearDraftApi().catch(() => {});
        }}
      />
      <Toast />
    </div>
  );
};
