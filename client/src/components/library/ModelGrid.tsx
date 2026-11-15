import React, { useState } from 'react';
import { Search, Box, X } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';
import { LibraryModel } from '../../types';
import { ModelCard } from './ModelCard';
import { Modal } from '../common/Modal';
import { ModelNormalisationModal } from './ModelNormalisationModal';
import { ModelOptimisationModal } from './ModelOptimisationModal';
import { ModelTagsModal } from './ModelTagsModal';
import { LibraryExtrasSection } from './LibraryExtrasSection';

export const ModelGrid: React.FC = () => {
  const {
    models,
    folders,
    searchQuery,
    selectedTag,
    isLoading,
    setSearchQuery,
    renameModel,
    moveModel,
    deleteModel
  } = useLibraryStore();

  const [renameTarget, setRenameTarget] = useState<LibraryModel | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const [moveTarget, setMoveTarget] = useState<LibraryModel | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  const [deleteTarget, setDeleteTarget] = useState<LibraryModel | null>(null);
  const [normTarget, setNormTarget] = useState<LibraryModel | null>(null);
  const [optTarget, setOptTarget] = useState<LibraryModel | null>(null);
  const [tagsTarget, setTagsTarget] = useState<LibraryModel | null>(null);

  const visibleModels = selectedTag
    ? models.filter((m) => (m.tags ?? []).includes(selectedTag))
    : models;

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;
    await renameModel(renameTarget.id, renameInput.trim());
    setRenameTarget(null);
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    await moveModel(moveTarget.id, targetFolderId ? targetFolderId : null);
    setMoveTarget(null);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    await deleteModel(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Search Bar */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '4px',
            padding: '4px 8px',
            border: '1px solid var(--border-color)'
          }}
        >
          <Search size={13} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tags Filter & Recently Used */}
      <LibraryExtrasSection />

      {/* Models Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gridAutoRows: 'max-content',
          gap: '10px',
          alignContent: 'start'
        }}
      >
        {isLoading && models.length === 0 ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                height: '140px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                opacity: 0.5,
              }}
            />
          ))
        ) : visibleModels.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 10px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              gap: '8px'
            }}
          >
            <Box size={32} opacity={0.4} />
            <div style={{ fontSize: '13px' }}>
              {searchQuery || selectedTag
                ? 'No models match your filter'
                : 'No 3D models in this folder'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>
              Upload .glb files above or drag them directly here
            </div>
          </div>
        ) : (
          visibleModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onRename={(m) => {
                setRenameTarget(m);
                setRenameInput(m.name);
              }}
              onMove={(m) => {
                setMoveTarget(m);
                setTargetFolderId(m.folderId || '');
              }}
              onManageTags={(m) => setTagsTarget(m)}
              onNormalise={(m) => setNormTarget(m)}
              onOptimise={(m) => setOptTarget(m)}
              onDelete={(m) => setDeleteTarget(m)}
            />
          ))
        )}
      </div>

      {/* Rename Modal */}
      <Modal
        title="Rename Model"
        isOpen={!!renameTarget}
        onClose={() => setRenameTarget(null)}
      >
        <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Model Name
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

      {/* Move Model Modal */}
      <Modal
        title="Move Model"
        isOpen={!!moveTarget}
        onClose={() => setMoveTarget(null)}
      >
        <form onSubmit={handleMoveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Target Folder
            </label>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '13px',
                color: 'var(--text-main)'
              }}
            >
              <option value="">Unassigned (Root)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setMoveTarget(null)}
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
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Move
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Model Modal */}
      <Modal
        title="Delete Model"
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will delete the 3D model file and its thumbnail.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
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
              type="button"
              onClick={handleDeleteSubmit}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                backgroundColor: 'var(--danger)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
      <ModelNormalisationModal
        model={normTarget}
        onClose={() => setNormTarget(null)}
      />
      <ModelOptimisationModal
        model={optTarget}
        onClose={() => setOptTarget(null)}
      />
      <ModelTagsModal
        model={tagsTarget}
        onClose={() => setTagsTarget(null)}
      />
    </div>
  );
};
