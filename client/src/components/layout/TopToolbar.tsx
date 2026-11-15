import React, { useState, useRef, useEffect } from 'react';
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
  RotateCcw,
  Undo2,
  Redo2,
  Magnet,
  FilePlus,
  FolderOpen,
  Save,
  FileDown,
  FileUp,
  ChevronDown,
  Sun,
  Images,
  ArrowDownToLine
} from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { BackgroundModal } from '../scene/BackgroundModal';

interface TopToolbarProps {
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
  onOpenAbout: () => void;
  onNewScene: () => void;
  onOpenScenesModal: () => void;
  onSaveScene: () => void;
  onSaveSceneAs: () => void;
  onExportScene: () => void;
  onImportScene: () => void;
  onOpenLighting: () => void;
  onOpenRender: () => void;
  onOpenGallery: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onOpenHelp,
  onOpenAdmin,
  onOpenAbout,
  onNewScene,
  onOpenScenesModal,
  onSaveScene,
  onSaveSceneAs,
  onExportScene,
  onImportScene,
  onOpenLighting,
  onOpenRender,
  onOpenGallery,
}) => {
  const {
    gridVisible,
    toggleGrid,
    selectedObjectIds,
    triggerFocus,
    triggerResetCamera,
    transformMode,
    setTransformMode,
    snap,
    updateSnap,
    past,
    future,
    undo,
    redo,
    currentSceneName,
    isDirty
  } = useSceneStore();

  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isSnapMenuOpen, setIsSnapMenuOpen] = useState(false);
  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);
  const snapMenuRef = useRef<HTMLDivElement>(null);
  const sceneMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (snapMenuRef.current && !snapMenuRef.current.contains(e.target as Node)) {
        setIsSnapMenuOpen(false);
      }
      if (sceneMenuRef.current && !sceneMenuRef.current.contains(e.target as Node)) {
        setIsSceneMenuOpen(false);
      }
    };
    if (isSnapMenuOpen || isSceneMenuOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isSnapMenuOpen, isSceneMenuOpen]);

  const anySnapActive = snap.positionEnabled || snap.rotationEnabled || snap.scaleEnabled;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenAbout}
            title="About 3D Scene Composer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text-main)',
              padding: '4px 6px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <Box size={18} color="var(--accent)" />
            <span>3D Scene Composer</span>
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Scene Menu & Current Scene Name */}
          <div ref={sceneMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setIsSceneMenuOpen((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: isSceneMenuOpen ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)'
              }}
            >
              <span>Scene</span>
              <ChevronDown size={13} />
            </button>

            <span
              title={isDirty ? `${currentSceneName} (Unsaved changes)` : currentSceneName}
              style={{
                fontSize: '12px',
                color: isDirty ? '#fbbf24' : 'var(--text-muted)',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentSceneName}
              {isDirty ? ' *' : ''}
            </span>

            {isSceneMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  width: '190px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                  padding: '4px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onNewScene(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FilePlus size={14} />
                  <span>New Scene</span>
                </button>
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onOpenScenesModal(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FolderOpen size={14} />
                  <span>Open Scene...</span>
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onSaveScene(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={14} /> Save</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ctrl+S</span>
                </button>
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onSaveSceneAs(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Save size={14} />
                  <span>Save As...</span>
                </button>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onExportScene(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FileDown size={14} />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => { setIsSceneMenuOpen(false); onImportScene(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', textAlign: 'left', color: 'var(--text-main)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FileUp size={14} />
                  <span>Import JSON...</span>
                </button>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Undo / Redo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={undo}
              disabled={past.length === 0}
              title="Undo (Ctrl+Z)"
              style={{
                padding: '5px',
                borderRadius: '4px',
                color: past.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                opacity: past.length > 0 ? 1 : 0.35,
                display: 'flex'
              }}
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              style={{
                padding: '5px',
                borderRadius: '4px',
                color: future.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                opacity: future.length > 0 ? 1 : 0.35,
                display: 'flex'
              }}
            >
              <Redo2 size={15} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Transform modes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={() => setTransformMode('translate')}
              title="Translate / Move (W)"
              style={{
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: transformMode === 'translate' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: transformMode === 'translate' ? 'var(--accent)' : 'var(--text-muted)',
                border: transformMode === 'translate' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                display: 'flex'
              }}
            >
              <Move size={15} />
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              title="Rotate (E)"
              style={{
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: transformMode === 'rotate' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: transformMode === 'rotate' ? 'var(--accent)' : 'var(--text-muted)',
                border: transformMode === 'rotate' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                display: 'flex'
              }}
            >
              <RotateCw size={15} />
            </button>
            <button
              onClick={() => setTransformMode('scale')}
              title="Scale (R)"
              style={{
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: transformMode === 'scale' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: transformMode === 'scale' ? 'var(--accent)' : 'var(--text-muted)',
                border: transformMode === 'scale' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                display: 'flex'
              }}
            >
              <Maximize2 size={15} />
            </button>
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Snapping Popover */}
          <div style={{ position: 'relative' }} ref={snapMenuRef}>
            <button
              onClick={() => setIsSnapMenuOpen(!isSnapMenuOpen)}
              title="Snapping Options"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: anySnapActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: anySnapActive ? 'var(--accent)' : 'var(--text-muted)',
                border: anySnapActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
              }}
            >
              <Magnet size={14} />
              <span>Snap</span>
            </button>

            {isSnapMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  width: '230px',
                  backgroundColor: 'var(--bg-panel-header)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Snapping Settings
                </div>

                {/* Position Snap */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={snap.positionEnabled}
                      onChange={(e) => updateSnap({ positionEnabled: e.target.checked })}
                    />
                    <span>Move (m)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={snap.positionValue}
                    onChange={(e) => updateSnap({ positionValue: Math.max(0.01, parseFloat(e.target.value) || 0.5) })}
                    style={{
                      width: '65px',
                      padding: '3px 6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  />
                </div>

                {/* Rotation Snap */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={snap.rotationEnabled}
                      onChange={(e) => updateSnap({ rotationEnabled: e.target.checked })}
                    />
                    <span>Rotate (°)</span>
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    value={snap.rotationValue}
                    onChange={(e) => updateSnap({ rotationValue: Math.max(1, parseFloat(e.target.value) || 15) })}
                    style={{
                      width: '65px',
                      padding: '3px 6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  />
                </div>

                {/* Scale Snap */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={snap.scaleEnabled}
                      onChange={(e) => updateSnap({ scaleEnabled: e.target.checked })}
                    />
                    <span>Scale</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={snap.scaleValue}
                    onChange={(e) => updateSnap({ scaleValue: Math.max(0.01, parseFloat(e.target.value) || 0.1) })}
                    style={{
                      width: '65px',
                      padding: '3px 6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '11px'
                    }}
                  />
                </div>

                {/* Surface Snap */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={snap.surfaceSnapEnabled}
                      onChange={(e) => updateSnap({ surfaceSnapEnabled: e.target.checked })}
                    />
                    <span>Snap to Surface</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => updateSnap({ surfaceSnapEnabled: !snap.surfaceSnapEnabled })}
            title="Snap to Surface: place & move objects on top of other objects"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: snap.surfaceSnapEnabled ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: snap.surfaceSnapEnabled ? 'var(--accent)' : 'var(--text-muted)',
              border: snap.surfaceSnapEnabled ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent'
            }}
          >
            <ArrowDownToLine size={14} />
            <span>Surface</span>
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

          {/* Viewport controls */}
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
            onClick={onOpenLighting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            title="Lighting Presets & HDRI"
          >
            <Sun size={14} />
            Lighting
          </button>

          <button
            onClick={onOpenRender}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}
            title="High-Quality Render"
          >
            <Camera size={14} />
            Render
          </button>

          <button
            onClick={onOpenGallery}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px'
            }}
            title="Render Gallery"
          >
            <Images size={14} />
            Gallery
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
