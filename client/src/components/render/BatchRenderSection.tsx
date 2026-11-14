import React from 'react';
import { Camera, CheckSquare, Download, Image as ImageIcon, Layers, Square } from 'lucide-react';
import type { CameraBookmark } from '@shared/types/scene';
import type { RenderRecord } from '@shared/types/render';

export interface BatchProgressState {
  total: number;
  completedCount: number;
  currentIndex: number;
  currentBookmarkName: string;
}

interface BatchSelectorProps {
  bookmarks: CameraBookmark[];
  mode: 'single' | 'batch';
  selectedIds: string[];
  disabled: boolean;
  onModeChange: (mode: 'single' | 'batch') => void;
  onToggleId: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export const BatchBookmarksSelector: React.FC<BatchSelectorProps> = ({
  bookmarks,
  mode,
  selectedIds,
  disabled,
  onModeChange,
  onToggleId,
  onSelectAll,
  onSelectNone,
}) => {
  const hasBookmarks = bookmarks.length > 0;
  const selectedSet = new Set(selectedIds);

  return (
    <div
      style={{
        padding: '10px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px', letterSpacing: '0.03em' }}>
          RENDER TARGET
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange('single')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              fontSize: '11px',
              borderRadius: '4px',
              backgroundColor: mode === 'single' ? 'var(--accent)' : 'var(--bg-input)',
              color: mode === 'single' ? '#fff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Camera size={12} />
            Current View
          </button>
          <button
            type="button"
            disabled={disabled || !hasBookmarks}
            onClick={() => onModeChange('batch')}
            title={hasBookmarks ? 'Render multiple saved camera bookmarks' : 'Save camera bookmarks first'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 9px',
              fontSize: '11px',
              borderRadius: '4px',
              backgroundColor: mode === 'batch' ? 'var(--accent)' : 'var(--bg-input)',
              color: mode === 'batch' ? '#fff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              opacity: hasBookmarks ? 1 : 0.45,
            }}
          >
            <Layers size={12} />
            Bookmarks Batch ({bookmarks.length})
          </button>
        </div>
      </div>

      {!hasBookmarks ? (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Tip: Save views in the <strong>Camera Bookmarks</strong> panel to enable batch rendering.
        </div>
      ) : mode === 'batch' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>
              Choose bookmarks to queue ({selectedIds.length} of {bookmarks.length} selected)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={disabled}
                onClick={onSelectAll}
                style={{ fontSize: '11px', color: 'var(--accent)', padding: '1px 4px' }}
              >
                Select All
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onSelectNone}
                style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '1px 4px' }}
              >
                None
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '115px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: '5px',
            }}
          >
            {bookmarks.map((b) => {
              const checked = selectedSet.has(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleId(b.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 8px',
                    borderRadius: '4px',
                    backgroundColor: checked ? 'rgba(59, 130, 246, 0.14)' : 'var(--bg-input)',
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-color)'}`,
                    color: 'var(--text-main)',
                    fontSize: '11px',
                    textAlign: 'left',
                    overflow: 'hidden',
                  }}
                >
                  {checked ? (
                    <CheckSquare size={13} color="var(--accent)" style={{ flexShrink: 0 }} />
                  ) : (
                    <Square size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface BatchProgressProps {
  batch: BatchProgressState;
  perRenderStage: string;
  perRenderPct: number;
}

export const BatchProgressBar: React.FC<BatchProgressProps> = ({
  batch,
  perRenderStage,
  perRenderPct,
}) => {
  const overallPct = Math.min(
    100,
    Math.round(((batch.completedCount + perRenderPct / 100) / Math.max(1, batch.total)) * 100)
  );

  return (
    <div
      style={{
        padding: '10px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
          <span>
            Overall Batch Progress ({Math.min(batch.completedCount + 1, batch.total)} / {batch.total}: <strong>{batch.currentBookmarkName}</strong>)
          </span>
          <span>{overallPct}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${overallPct}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.15s ease' }} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>{perRenderStage}</span>
          <span>{perRenderPct}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${perRenderPct}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.15s ease' }} />
        </div>
      </div>
    </div>
  );
};

interface BatchResultsProps {
  results: RenderRecord[];
  onClose: () => void;
  onOpenGallery: () => void;
}

export const BatchResultsSummary: React.FC<BatchResultsProps> = ({
  results,
  onClose,
  onOpenGallery,
}) => {
  if (results.length === 0) return null;

  return (
    <div
      style={{
        padding: '10px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '6px',
        border: '1px solid var(--success)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6ee7b7', fontWeight: 600 }}>
          Saved {results.length} batch render{results.length === 1 ? '' : 's'} to gallery
        </span>
        <button
          onClick={() => {
            onClose();
            onOpenGallery();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: '4px',
          }}
        >
          <ImageIcon size={13} />
          View in Gallery
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '8px',
          maxHeight: '190px',
          overflowY: 'auto',
        }}
      >
        {results.map((r) => (
          <div
            key={r.id}
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <img
              src={`/api/renders/${r.id}/thumbnail`}
              alt={r.name}
              style={{ width: '100%', height: '72px', objectFit: 'cover' }}
            />
            <div style={{ padding: '4px 6px', fontSize: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.cameraName || r.name}
              </span>
              <a
                href={`/api/renders/${r.id}/file`}
                download={`${r.name}.png`}
                title={`Download ${r.name}.png`}
                style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
              >
                <Download size={11} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
