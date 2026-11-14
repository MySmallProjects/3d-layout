import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Edit2,
  Trash2
} from 'lucide-react';
import { FolderNode } from '../../types';
import { useLibraryStore } from '../../store/libraryStore';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

interface FolderItemProps {
  node: FolderNode;
  level?: number;
  onNewSubfolder: (parentId: string) => void;
  onRenameFolder: (folder: FolderNode) => void;
  onDeleteFolder: (folder: FolderNode) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  node,
  level = 0,
  onNewSubfolder,
  onRenameFolder,
  onDeleteFolder
}) => {
  const { selectedFolderId, setSelectedFolder, moveModel } = useLibraryStore();
  const [isOpen, setIsOpen] = useState(true);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
    const modelId = e.dataTransfer.getData('application/3d-model-id');
    if (modelId) {
      moveModel(modelId, node.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems: ContextMenuItem[] = [
    {
      label: 'New Subfolder',
      icon: <FolderPlus size={14} />,
      onClick: () => onNewSubfolder(node.id)
    },
    {
      label: 'Rename',
      icon: <Edit2 size={14} />,
      onClick: () => onRenameFolder(node)
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => onDeleteFolder(node)
    }
  ];

  return (
    <div>
      <div
        onClick={() => setSelectedFolder(node.id)}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 8px',
          paddingLeft: `${8 + level * 14}px`,
          fontSize: '12px',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: isDropTarget
            ? 'rgba(59, 130, 246, 0.25)'
            : isSelected
            ? 'var(--bg-card-hover)'
            : 'transparent',
          color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
          border: isDropTarget ? '1px dashed var(--accent)' : '1px solid transparent',
          transition: 'background 0.15s ease'
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            opacity: hasChildren ? 1 : 0
          }}
        >
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>

        {isOpen ? (
          <FolderOpen size={14} color={isSelected ? 'var(--accent)' : '#eab308'} />
        ) : (
          <FolderIcon size={14} color={isSelected ? 'var(--accent)' : '#eab308'} />
        )}

        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        {node.modelCount > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.7 }}>
            {node.modelCount}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              level={level + 1}
              onNewSubfolder={onNewSubfolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
