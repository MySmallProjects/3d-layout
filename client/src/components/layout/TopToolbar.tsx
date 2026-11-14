import React, { useState } from 'react';
import {
  HelpCircle,
  Shield,
  Box,
  Grid,
  Move,
  RotateCw,
  Maximize2,
  Camera,
  Image as ImageIcon,
  Focus,
  RotateCcw
} from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { BackgroundModal } from '../scene/BackgroundModal';

interface TopToolbarProps {
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ onOpenHelp, onOpenAdmin }) => {
  const {
    gridVisible,
    toggleGrid,
    selectedObjectIds,
    triggerFocus,
    triggerResetCamera
  } = useSceneStore();

  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  return (
    <>
      <header
        style={{
          height: '42px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px' }}>
            <Box size={18} color="var(--accent)" />
            <span>3D Scene Composer</span>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Transform tool placeholders for Phase 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              title="Translate (W) - Phase 3"
              disabled
              style={{
                padding: '5px',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                opacity: 0.4,
                display: 'flex'
              }}
            >
              <Move size={15} />
            </button>
            <button
              title="Rotate (E) - Phase 3"
              disabled
              style={{
                padding: '5px',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                opacity: 0.4,
                display: 'flex'
              }}
            >
              <RotateCw size={15} />
            </button>
            <button
              title="Scale (R) - Phase 3"
              disabled
              style={{
                padding: '5px',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                opacity: 0.4,
                display: 'flex'
              }}
            >
              <Maximize2 size={15} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Viewport controls (Active in Phase 2) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={toggleGrid}
              title={`Toggle Grid (G) - Currently ${gridVisible ? 'ON' : 'OFF'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: gridVisible ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: gridVisible ? 'var(--accent)' : 'var(--text-muted)',
                border: gridVisible ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
              }}
            >
              <Grid size={14} />
              <span>Grid</span>
            </button>

            <button
              onClick={() => setIsBgModalOpen(true)}
              title="Background settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              <ImageIcon size={14} />
              <span>Background</span>
            </button>

            <button
              onClick={triggerFocus}
              disabled={selectedObjectIds.length === 0}
              title="Focus Selected (F)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: selectedObjectIds.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                opacity: selectedObjectIds.length > 0 ? 1 : 0.4
              }}
            >
              <Focus size={14} />
              <span>Focus</span>
            </button>

            <button
              onClick={triggerResetCamera}
              title="Reset View (Home)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            disabled
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              opacity: 0.5,
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            title="Render scene (Phase 6)"
          >
            <Camera size={14} />
            Render
          </button>

          <button
            onClick={onOpenHelp}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-muted)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            title="Help & Shortcuts (?)"
          >
            <HelpCircle size={15} />
            <span>Help</span>
          </button>

          <button
            onClick={onOpenAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-muted)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            title="Admin"
          >
            <Shield size={15} />
            <span>Admin</span>
          </button>
        </div>
      </header>

      <BackgroundModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
      />
    </>
  );
};
