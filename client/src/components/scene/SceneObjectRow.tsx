import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Box, Copy, Edit2, Trash2 } from 'lucide-react';
import { SceneObject, LibraryModel } from '../../types';
import { useSceneStore } from '../../store/sceneStore';
import { ContextMenu, ContextMenuItem } from '../library/ContextMenu';

interface SceneObjectRowProps {
  object: SceneObject;
  model?: LibraryModel;
  onRename: (object: SceneObject) => void;
}

export const SceneObjectRow: React.FC<SceneObjectRowProps> = ({
  object,
  model,
  onRename
}) => {
  const {
    selectedObjectIds,
    selectObject,
    toggleVisibility,
    toggleLock,
    duplicateObject,
    deleteObjects,
    triggerFocus
  } = useSceneStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isSelected = selectedObjectIds.includes(object.id);

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectObject(object.id, e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectObject(object.id, false);
    triggerFocus();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Focus Object (F)',
      onClick: () => {
        selectObject(object.id, false);
        triggerFocus();
      }
    },
    {
      label: 'Rename',
      icon: <Edit2 size={13} />,
      onClick: () => onRename(object)
    },
    {
      label: 'Duplicate (Ctrl+D)',
      icon: <Copy size={13} />,
      onClick: () => duplicateObject(object.id)
    },
    {
      label: 'Delete (Delete)',
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: () => deleteObjects([object.id])
    }
  ];

  const thumbnailUrl = model?.thumbnailPath
    ? `/api/models/${model.id}/thumbnail?t=${model.thumbnailPath}`
    : null;

  return (
    <>
      <div
        onClick={handleRowClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
          border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
          opacity: object.visible ? (object.locked ? 0.65 : 1) : 0.45,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Model thumbnail preview */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Box size={14} color="var(--text-muted)" />
          )}
        </div>

        {/* Object Name */}
        <span
          title={object.name}
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: isSelected ? 500 : 400
          }}
        >
          {object.name}
        </span>

        {/* Quick action buttons: Visibility & Lock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleVisibility(object.id)}
            title={object.visible ? 'Hide object' : 'Show object'}
            style={{
              padding: '4px',
              borderRadius: '3px',
              color: object.visible ? 'var(--text-muted)' : 'var(--danger)',
              display: 'flex'
            }}
          >
            {object.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <button
            onClick={() => toggleLock(object.id)}
            title={object.locked ? 'Unlock object' : 'Lock object'}
            style={{
              padding: '4px',
              borderRadius: '3px',
              color: object.locked ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex'
            }}
          >
            {object.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
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
