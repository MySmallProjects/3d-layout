import React from 'react';
import { HelpCircle, Shield, Box, Grid, Move, RotateCw, Maximize2, Camera } from 'lucide-react';

interface TopToolbarProps {
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ onOpenHelp, onOpenAdmin }) => {
  return (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px' }}>
          <Box size={18} color="var(--accent)" />
          <span>3D Scene Composer</span>
        </div>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)' }} />

        {/* Transform tool placeholders for Phase 2/3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            title="Translate (W)"
            disabled
            style={{
              padding: '5px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              opacity: 0.5,
              display: 'flex'
            }}
          >
            <Move size={15} />
          </button>
          <button
            title="Rotate (E)"
            disabled
            style={{
              padding: '5px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              opacity: 0.5,
              display: 'flex'
            }}
          >
            <RotateCw size={15} />
          </button>
          <button
            title="Scale (R)"
            disabled
            style={{
              padding: '5px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              opacity: 0.5,
              display: 'flex'
            }}
          >
            <Maximize2 size={15} />
          </button>
          <button
            title="Grid Toggle (G)"
            disabled
            style={{
              padding: '5px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              opacity: 0.5,
              display: 'flex'
            }}
          >
            <Grid size={15} />
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
  );
};
