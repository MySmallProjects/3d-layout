import React, { useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';

export const CameraBookmarksPanel: React.FC = () => {
  const {
    cameraBookmarks,
    addCameraBookmark,
    jumpToCameraBookmark,
    renameCameraBookmark,
    updateCameraBookmarkFromCurrent,
    deleteCameraBookmark,
  } = useSceneStore();
  const { showToast } = useLibraryStore();

  const [expanded, setExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const openAddForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(true);
    setNewName(`Camera ${cameraBookmarks.length + 1}`);
    setIsAdding(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = addCameraBookmark(newName);
    setActiveId(created.id);
    setIsAdding(false);
    setNewName('');
    showToast(`Saved camera "${created.name}"`, 'success');
  };

  const handleJump = (id: string) => {
    if (editingId === id) return;
    jumpToCameraBookmark(id);
    setActiveId(id);
  };

  const startRename = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = (id: string) => {
    if (editName.trim()) {
      renameCameraBookmark(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleUpdateFromView = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    updateCameraBookmarkFromCurrent(id);
    setActiveId(id);
    showToast(`Updated "${name}" to current view`, 'success');
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    deleteCameraBookmark(id);
    if (activeId === id) setActiveId(null);
    showToast(`Deleted camera "${name}"`, 'info');
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
      {/* Header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: expanded ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {expanded ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}
          <Camera size={13} color="var(--accent)" />
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
            CAMERA BOOKMARKS
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({cameraBookmarks.length})
          </span>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          title="Bookmark current camera view"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 7px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            fontSize: '11px',
          }}
        >
          <Plus size={12} />
          Save View
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '6px', maxHeight: '170px', overflowY: 'auto' }}>
          {isAdding && (
            <form
              onSubmit={handleAddSubmit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '6px',
                padding: '4px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '4px',
                border: '1px solid var(--accent)',
              }}
            >
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    setIsAdding(false);
                  }
                }}
                placeholder="Bookmark name..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '3px 6px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  fontSize: '11px',
                  color: 'var(--text-main)',
                }}
              />
              <button
                type="submit"
                title="Save bookmark"
                style={{ padding: '3px', color: '#4ade80', display: 'flex' }}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                title="Cancel"
                style={{ padding: '3px', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={13} />
              </button>
            </form>
          )}

          {cameraBookmarks.length === 0 && !isAdding ? (
            <div
              style={{
                padding: '10px 8px',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              No camera bookmarks yet. Click <strong>+ Save View</strong> to save the current angle.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {cameraBookmarks.map((b) => {
                const isEditing = editingId === b.id;
                const isActive = activeId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleJump(b.id)}
                    title={`Click to jump to "${b.name}"`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 7px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.14)' : 'var(--bg-card)',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={12} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />

                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => commitRename(b.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename(b.id);
                          } else if (e.key === 'Escape') {
                            e.stopPropagation();
                            setEditingId(null);
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '2px 5px',
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--accent)',
                          borderRadius: '3px',
                          fontSize: '11px',
                          color: 'var(--text-main)',
                        }}
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => startRename(e, b.id, b.name)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--text-main)',
                        }}
                      >
                        {b.name}
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => handleUpdateFromView(e, b.id, b.name)}
                        title="Update bookmark to current camera view"
                        style={{ padding: '3px', color: 'var(--text-muted)', display: 'flex', borderRadius: '3px' }}
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => startRename(e, b.id, b.name)}
                        title="Rename bookmark"
                        style={{ padding: '3px', color: 'var(--text-muted)', display: 'flex', borderRadius: '3px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, b.id, b.name)}
                        title="Delete bookmark"
                        style={{ padding: '3px', color: 'var(--danger)', display: 'flex', borderRadius: '3px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
