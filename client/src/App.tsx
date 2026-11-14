import React, { useEffect, useState } from 'react';
import { TopToolbar } from './components/layout/TopToolbar';
import { VersionBadge } from './components/layout/VersionBadge';
import { HelpModal } from './components/layout/HelpModal';
import { AdminModal } from './components/layout/AdminModal';
import { AboutModal } from './components/layout/AboutModal';
import { getVersionInfo } from './utils/version';
import { LibraryPanel } from './components/library/LibraryPanel';
import { Viewport } from './components/viewport/Viewport';
import { SceneObjectsPanel } from './components/scene/SceneObjectsPanel';
import { Toast } from './components/common/Toast';
import { useLibraryStore } from './store/libraryStore';
import { useSceneStore } from './store/sceneStore';
import { matchShortcutAction } from './constants/shortcuts';

export const App: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { loadLibrary } = useLibraryStore();
  const { versionDisplay, buildDateFormatted } = getVersionInfo();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Top Toolbar */}
      <TopToolbar
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
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
        onOpenAdmin={() => setIsAdminOpen(true)}
        versionDisplay={versionDisplay}
        buildDate={buildDateFormatted}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <Toast />
    </div>
  );
};
