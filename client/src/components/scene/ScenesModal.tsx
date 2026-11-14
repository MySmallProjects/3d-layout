import React, { useEffect, useState } from 'react';
import { FolderOpen, Copy, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import type { SceneListItem } from '@shared/types/scene';
import { Modal } from '../common/Modal';
import {
  fetchScenes,
  renameSceneApi,
  duplicateSceneApi,
  deleteSceneApi,
} from '../../api/scenes';

interface ScenesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSceneId: string | null;
  onOpenScene: (id: string) => Promise<void>;
  onRenamedCurrentScene?: (id: string, newName: string) => void;
}

export const ScenesModal: React.FC<ScenesModalProps> = ({
  isOpen,
  onClose,
  currentSceneId,
  onOpenScene,
  onRenamedCurrentScene,
}) => {
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadList = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchScenes();
      setScenes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
      setRenamingId(null);
    }
  }, [isOpen]);

  const handleRenameSubmit = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await renameSceneApi(id, trimmed);
      setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, name: updated.name } : s)));
      if (id === currentSceneId) {
        onRenamedCurrentScene?.(id, updated.name);
      }
      setRenamingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateSceneApi(id);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const handleDelete = async (scene: SceneListItem) => {
    if (!window.confirm(`Delete scene "${scene.name}"? This cannot be undone.`)) return;
    try {
      await deleteSceneApi(scene.id);
      setScenes((prev) => prev.filter((s) => s.id !== scene.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Saved Scenes" width="640px">
      {error && (
        <div
          style={{
            padding: '8px 10px',
            marginBottom: '12px',
            borderRadius: '4px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#fca5a5',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading scenes...
        </div>
      ) : scenes.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No saved scenes yet. Use <strong>Scene → Save</strong> to save your current layout.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scenes.map((scene) => {
            const isCurrent = scene.id === currentSceneId;
            return (
              <div
                key={scene.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: isCurrent
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid var(--border-color)',
                  backgroundColor: isCurrent ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '44px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-input)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {scene.thumbnailPath ? (
                    <img
                      src={`/api/scenes/${scene.id}/thumbnail?t=${encodeURIComponent(scene.updatedAt)}`}
                      alt={scene.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={16} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === scene.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(scene.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(scene.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: '13px',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-focus)',
                        borderRadius: '4px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {scene.name}
                      {isCurrent && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#60a5fa' }}>
                          (Current)
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Updated {new Date(scene.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => onOpenScene(scene.id)}
                    title="Open scene"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      borderRadius: '4px',
                    }}
                  >
                    <FolderOpen size={13} />
                    Open
                  </button>
                  <button
                    onClick={() => {
                      setRenamingId(scene.id);
                      setRenameValue(scene.name);
                    }}
                    title="Rename"
                    style={{ padding: '5px', color: 'var(--text-muted)' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(scene.id)}
                    title="Duplicate as template"
                    style={{ padding: '5px', color: 'var(--text-muted)' }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(scene)}
                    title="Delete"
                    style={{ padding: '5px', color: '#f87171' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
