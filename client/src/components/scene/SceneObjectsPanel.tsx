import React, { useState } from 'react';
import { Layers, Trash2, XCircle } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import { SceneObject } from '../../types';
import { SceneObjectRow } from './SceneObjectRow';
import { Modal } from '../common/Modal';

export const SceneObjectsPanel: React.FC = () => {
  const { objects, selectedObjectIds, deselectAll, deleteObjects, renameObject } = useSceneStore();
  const { models } = useLibraryStore();

  const [renameTarget, setRenameTarget] = useState<SceneObject | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;
    renameObject(renameTarget.id, renameInput.trim());
    setRenameTarget(null);
  };

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '240px',
        maxWidth: '360px',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-panel-header)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="var(--accent)" />
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em' }}>
            SCENE OBJECTS
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({objects.length})
          </span>
        </div>

        {selectedObjectIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={deselectAll}
              title="Deselect all (Esc)"
              style={{
                color: 'var(--text-muted)',
                padding: '2px',
                borderRadius: '3px',
                display: 'flex'
              }}
            >
              <XCircle size={14} />
            </button>
            <button
              onClick={() => deleteObjects(selectedObjectIds)}
              title="Delete selected (Delete)"
              style={{
                color: 'var(--danger)',
                padding: '2px',
                borderRadius: '3px',
                display: 'flex'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Object List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {objects.length === 0 ? (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'center'
            }}
          >
            <Layers size={28} opacity={0.3} />
            <div>No objects in the scene</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>
              Drag models from the Asset Library to add them
            </div>
          </div>
        ) : (
          objects.map((obj) => (
            <SceneObjectRow
              key={obj.id}
              object={obj}
              model={models.find((m) => m.id === obj.modelId)}
              onRename={(target) => {
                setRenameTarget(target);
                setRenameInput(target.name);
              }}
            />
          ))
        )}
      </div>

      {/* Rename Modal */}
      <Modal
        title="Rename Scene Object"
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
      >
        <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Object Name
            </label>
            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renameInput.trim()}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </aside>
  );
};
