import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';

interface ResizableSidePanelProps {
  side: 'left' | 'right';
  label: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  children: React.ReactNode;
}

export const ResizableSidePanel: React.FC<ResizableSidePanelProps> = ({
  side,
  label,
  defaultWidth,
  minWidth,
  maxWidth,
  children,
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [collapsed, setCollapsed] = useState(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      const next = Math.max(minWidth, Math.min(maxWidth, startWidth + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (collapsed) {
    return (
      <div
        style={{
          width: '28px',
          height: '100%',
          backgroundColor: 'var(--bg-panel-header)',
          borderRight: side === 'left' ? '1px solid var(--border-color)' : 'none',
          borderLeft: side === 'right' ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '10px',
          gap: '12px',
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title={`Expand ${label}`}
          style={{
            padding: '4px',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
          }}
        >
          {side === 'left' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            userSelect: 'none',
          }}
        >
          {label.toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${width}px`,
        height: '100%',
        position: 'relative',
        flexShrink: 0,
        borderRight: side === 'left' ? '1px solid var(--border-color)' : 'none',
        borderLeft: side === 'right' ? '1px solid var(--border-color)' : 'none',
        display: 'flex',
      }}
    >
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{children}</div>

      {/* Collapse button on the edge */}
      <button
        onClick={() => setCollapsed(true)}
        title={`Collapse ${label}`}
        style={{
          position: 'absolute',
          top: '8px',
          [side === 'left' ? 'right' : 'left']: '-12px',
          width: '12px',
          height: '28px',
          backgroundColor: 'var(--bg-panel-header)',
          border: '1px solid var(--border-color)',
          borderRadius: side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          zIndex: 25,
          padding: 0,
        }}
      >
        {side === 'left' ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
      </button>

      {/* Drag resize handle */}
      <div
        onMouseDown={startResize}
        title="Drag to resize panel"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side === 'left' ? 'right' : 'left']: '-3px',
          width: '6px',
          cursor: 'col-resize',
          zIndex: 22,
        }}
      />
    </div>
  );
};

export const ServerStatusBanner: React.FC = () => {
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const { loadLibrary } = useLibraryStore();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ online: boolean; message?: string }>).detail;
      if (detail.online) {
        setOfflineMessage(null);
      } else {
        setOfflineMessage(
          detail.message || 'Connection to the backend server was lost. Waiting for server...'
        );
      }
    };
    window.addEventListener('server-connection-status', handler);
    return () => window.removeEventListener('server-connection-status', handler);
  }, []);

  if (!offlineMessage) return null;

  return (
    <div
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
        color: '#fca5a5',
        padding: '6px 14px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 60,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={14} />
        {offlineMessage}
      </span>
      <button
        onClick={() => loadLibrary()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          fontSize: '11px',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
        }}
      >
        <RefreshCw size={11} />
        Retry Connection
      </button>
    </div>
  );
};
