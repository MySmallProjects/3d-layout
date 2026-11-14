import React, { useState } from 'react';
import { Box, Loader2, Edit2, FolderInput, RefreshCw, RotateCcw, Ruler, Sparkles, Trash2 } from 'lucide-react';
import { LibraryModel } from '../../types';
import { useLibraryStore } from '../../store/libraryStore';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

interface ModelCardProps {
  model: LibraryModel;
  onRename: (model: LibraryModel) => void;
  onMove: (model: LibraryModel) => void;
  onNormalise: (model: LibraryModel) => void;
  onOptimise: (model: LibraryModel) => void;
  onDelete: (model: LibraryModel) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  onRename,
  onMove,
  onNormalise,
  onOptimise,
  onDelete
}) => {
  const {
    generatingThumbnails,
    optimisingModels,
    regenerateThumbnail,
    renormaliseModel,
    optimiseModel,
    revertModel,
    showToast
  } = useLibraryStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const isGenerating = !!generatingThumbnails[model.id];
  const isOptimising = !!optimisingModels[model.id];
  const opt = model.optimisation;
  const isOptimised = Boolean(opt?.optimised);
  const savedPct =
    opt && opt.originalSizeBytes > 0
      ? Math.round((1 - opt.optimisedSizeBytes / opt.originalSizeBytes) * 100)
      : 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/3d-model-id', model.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Rename',
      icon: <Edit2 size={14} />,
      onClick: () => onRename(model)
    },
    {
      label: 'Move to...',
      icon: <FolderInput size={14} />,
      onClick: () => onMove(model)
    },
    {
      label: 'Normalisation...',
      icon: <Ruler size={14} />,
      onClick: () => onNormalise(model)
    },
    {
      label: 'Re-normalise',
      icon: <RefreshCw size={14} />,
      onClick: () => {
        renormaliseModel(model.id)
          .then(() => showToast(`Re-normalised "${model.name}"`, 'success'))
          .catch((err) => showToast(err instanceof Error ? err.message : 'Re-normalise failed', 'error'));
      }
    },
    {
      label: 'GLB Optimisation...',
      icon: <Sparkles size={14} />,
      onClick: () => onOptimise(model)
    },
    isOptimised
      ? {
          label: 'Revert to Original GLB',
          icon: <RotateCcw size={14} />,
          onClick: () => {
            revertModel(model.id)
              .then((u) => showToast(`Reverted "${model.name}" (${formatSize(u.sizeBytes)})`, 'success'))
              .catch((err) => showToast(err instanceof Error ? err.message : 'Revert failed', 'error'));
          }
        }
      : {
          label: 'Optimise GLB Now',
          icon: <Sparkles size={14} />,
          onClick: () => {
            optimiseModel(model.id)
              .then((u) => {
                const after = u.optimisation;
                showToast(
                  after
                    ? `Optimised "${model.name}": ${formatSize(after.originalSizeBytes)} → ${formatSize(after.optimisedSizeBytes)}`
                    : `Optimised "${model.name}"`,
                  'success'
                );
              })
              .catch((err) => showToast(err instanceof Error ? err.message : 'Optimisation failed', 'error'));
          }
        },
    {
      label: 'Regenerate Thumbnail',
      icon: <RefreshCw size={14} />,
      onClick: () => {
        setImgError(false);
        regenerateThumbnail(model.id);
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDelete(model)
    }
  ];

  const thumbnailUrl = model.thumbnailPath
    ? `/api/models/${model.id}/thumbnail?t=${model.thumbnailPath}`
    : null;

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => onRename(model)}
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          cursor: 'grab',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.backgroundColor = 'var(--bg-card)';
        }}
      >
        {/* Thumbnail preview container */}
        <div
          style={{
            height: '112px',
            flexShrink: 0,
            backgroundColor: 'var(--bg-input)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Loader2 size={20} className="animate-spin" color="var(--accent)" />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rendering preview...</span>
            </div>
          ) : thumbnailUrl && !imgError ? (
            <img
              src={thumbnailUrl}
              alt={model.name}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Box size={24} color="var(--text-muted)" opacity={0.6} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImgError(false);
                  regenerateThumbnail(model.id);
                }}
                style={{
                  fontSize: '9px',
                  color: 'var(--accent)',
                  textDecoration: 'underline'
                }}
              >
                Generate Preview
              </button>
            </div>
          )}
        </div>

        {/* Model info */}
        <div style={{ padding: '6px 8px' }}>
          <div
            title={model.name}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-main)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {model.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
            <span
              title={
                isOptimised && opt
                  ? `Original: ${formatSize(opt.originalSizeBytes)} → Optimised: ${formatSize(opt.optimisedSizeBytes)}`
                  : undefined
              }
            >
              {isOptimising
                ? 'Optimising...'
                : isOptimised && opt
                  ? `${formatSize(opt.originalSizeBytes)} → ${formatSize(model.sizeBytes)}`
                  : formatSize(model.sizeBytes)}
            </span>
            <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
              {isOptimised && (
                <span
                  title={`Optimised (Meshopt + WebP, ${savedPct >= 0 ? `-${savedPct}%` : `+${-savedPct}%`})`}
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    backgroundColor: 'rgba(34, 197, 94, 0.14)',
                    color: '#4ade80',
                  }}
                >
                  {savedPct > 0 ? `-${savedPct}%` : 'Opt'}
                </span>
              )}
              {model.normalisation?.enabled && (
                <span
                  title={`Normalised target size: ${model.normalisation.targetSize}`}
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    backgroundColor: 'rgba(59,130,246,0.18)',
                    color: '#93c5fd',
                  }}
                >
                  {model.normalisation.targetSize}m
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};
