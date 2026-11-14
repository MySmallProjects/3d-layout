import React, { useEffect, useState } from 'react';
import { TopToolbar } from './components/layout/TopToolbar';
import { VersionBadge } from './components/layout/VersionBadge';
import { HelpModal } from './components/layout/HelpModal';
import { AdminModal } from './components/layout/AdminModal';
import { LibraryPanel } from './components/library/LibraryPanel';
import { Toast } from './components/common/Toast';
import { useLibraryStore } from './store/libraryStore';
import { Box, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const { loadLibrary } = useLibraryStore();

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Global '?' shortcut for Help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setIsHelpOpen((prev) => !prev);
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
      />

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left: Asset Library Panel */}
        <LibraryPanel />

        {/* Center: 3D Viewport placeholder for Phase 2 */}
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-app)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'var(--text-muted)',
              gap: '12px',
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box size={32} opacity={0.4} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)', marginBottom: '4px' }}>
                3D Viewport Canvas
              </div>
              <div style={{ fontSize: '12px', maxWidth: '320px', lineHeight: '1.4' }}>
                Asset Library is ready. Drag-and-drop models into the scene canvas will activate in Phase 2.
              </div>
            </div>
          </div>
        </main>

        {/* Right: Scene Objects & Properties Panel placeholder for Phase 2/3 */}
        <aside
          style={{
            width: '260px',
            backgroundColor: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-panel-header)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={14} color="var(--accent)" />
            <span>SCENE OBJECTS</span>
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              textAlign: 'center'
            }}
          >
            Scene objects and properties panel (Phase 2 & 3)
          </div>
        </aside>
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
