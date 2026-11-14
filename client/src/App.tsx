import React, { useEffect, useState } from 'react';
import { TopToolbar } from './components/layout/TopToolbar';
import { VersionBadge } from './components/layout/VersionBadge';
import { HelpModal } from './components/layout/HelpModal';
import { AdminModal } from './components/layout/AdminModal';
import { LibraryPanel } from './components/library/LibraryPanel';
import { Viewport } from './components/viewport/Viewport';
import { SceneObjectsPanel } from './components/scene/SceneObjectsPanel';
import { Toast } from './components/common/Toast';
import { useLibraryStore } from './store/libraryStore';
import { useSceneStore } from './store/sceneStore';

export const App: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const { loadLibrary } = useLibraryStore();
  const {
    toggleGrid,
    triggerFocus,
    triggerResetCamera,
    deselectAll,
    selectedObjectIds,
    deleteObjects,
    duplicateObject
  } = useSceneStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive =
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (isInputActive) return;

      // ? : Help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setIsHelpOpen((prev) => !prev);
        return;
      }

      // G : Toggle Grid
      if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey) {
          toggleGrid();
          return;
        }
      }

      // F : Focus Selected
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          triggerFocus();
          return;
        }
      }

      // Home : Reset Camera View
      if (e.key === 'Home') {
        triggerResetCamera();
        return;
      }

      // Esc : Deselect All
      if (e.key === 'Escape') {
        deselectAll();
        return;
      }

      // Delete / Backspace : Remove Selected Objects
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectIds.length > 0) {
          deleteObjects(selectedObjectIds);
          return;
        }
      }

      // Ctrl+D : Duplicate Selected Object
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedObjectIds.length > 0) {
          duplicateObject(selectedObjectIds[0]);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    toggleGrid,
    triggerFocus,
    triggerResetCamera,
    deselectAll,
    selectedObjectIds,
    deleteObjects,
    duplicateObject
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Top Toolbar */}
      <TopToolbar
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
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

        {/* Right: Scene Objects List Panel */}
        <SceneObjectsPanel />
      </div>

      {/* Version badge (bottom right) */}
      <VersionBadge
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Modals & Toasts */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <Toast />
    </div>
  );
};
