import React, { useState } from 'react';
import { Layers, Folder, FolderPlus } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';
import { FolderNode } from '../../types';
import { FolderItem } from './FolderItem';
import { Modal } from '../common/Modal';

export const FolderTree: React.FC = () => {
  const {
    folderTree,
    selectedFolderId,
    setSelectedFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveModel
  } = useLibraryStore();

  const [createModal, setCreateModal] = useState<{ isOpen: boolean; parentId: string | null }>({
    isOpen: false,
    parentId: null
  });
  const [folderNameInput, setFolderNameInput] = useState('');

  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; folder: FolderNode | null }>({
    isOpen: false,
    folder: null
  });
  const [renameInput, setRenameInput] = useState('');

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; folder: FolderNode | null }>({
    isOpen: false,
    folder: null
  });
  const [deleteContents, setDeleteContents] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    await createFolder(folderNameInput.trim(), createModal.parentId);
    setCreateModal({ isOpen: false, parentId: null });
    setFolderNameInput('');
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal.folder || !renameInput.trim()) return;
    await renameFolder(renameModal.folder.id, renameInput.trim());
    setRenameModal({ isOpen: false, folder: null });
    setRenameInput('');
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModal.folder) return;
    await deleteFolder(deleteModal.folder.id, deleteContents);
    setDeleteModal({ isOpen: false, folder: null });
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const modelId = e.dataTransfer.getData('application/3d-model-id');
    if (modelId) {
      moveModel(modelId, null);
    }
  };

  return (
    <div style={{ padding: '8px 4px', borderBottom: '1px solid var(--border-color)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          marginBottom: '4px'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Folders
        </span>
        <button
          onClick={() => {
            setFolderNameInput('');
            setCreateModal({ isOpen: true, parentId: null });
          }}
          title="New root folder"
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            padding: '2px',
            borderRadius: '4px'
          }}
        >
          <FolderPlus size={14} />
        </button>
      </div>

      {/* All models */}
      <div
        onClick={() => setSelectedFolder(undefined)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: selectedFolderId === undefined ? 'var(--bg-card-hover)' : 'transparent',
          color: selectedFolderId === undefined ? 'var(--text-main)' : 'var(--text-muted)'
        }}
      >
        <Layers size={14} color={selectedFolderId === undefined ? 'var(--accent)' : 'var(--text-muted)'} />
        <span>All Models</span>
      </div>

      {/* Root / Uncategorized */}
      <div
        onClick={() => setSelectedFolder(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          borderRadius: '4px',
          backgroundColor: selectedFolderId === null ? 'var(--bg-card-hover)' : 'transparent',
          color: selectedFolderId === null ? 'var(--text-main)' : 'var(--text-muted)'
        }}
      >
        <Folder size={14} color={selectedFolderId === null ? 'var(--accent)' : 'var(--text-muted)'} />
        <span>Unassigned (Root)</span>
      </div>

      {/* Folder Tree */}
      <div style={{ marginTop: '2px' }}>
        {folderTree.map((node) => (
          <FolderItem
            key={node.id}
            node={node}
            onNewSubfolder={(parentId) => {
              setFolderNameInput('');
              setCreateModal({ isOpen: true, parentId });
            }}
            onRenameFolder={(folder) => {
              setRenameInput(folder.name);
              setRenameModal({ isOpen: true, folder });
            }}
            onDeleteFolder={(folder) => {
              setDeleteContents(false);
              setDeleteModal({ isOpen: true, folder });
            }}
          />
        ))}
      </div>

      {/* Create Folder Modal */}
      <Modal
        title={createModal.parentId ? 'New Subfolder' : 'New Folder'}
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ isOpen: false, parentId: null })}
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              placeholder="e.g. Characters, Props, Furniture"
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
              onClick={() => setCreateModal({ isOpen: false, parentId: null })}
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
              disabled={!folderNameInput.trim()}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal
        title="Rename Folder"
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, folder: null })}
      >
        <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              New Name
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
              onClick={() => setRenameModal({ isOpen: false, folder: null })}
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

      {/* Delete Folder Modal */}
      <Modal
        title="Delete Folder"
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, folder: null })}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
            Are you sure you want to delete folder &quot;{deleteModal.folder?.name}&quot;?
          </p>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={deleteContents}
              onChange={(e) => setDeleteContents(e.target.checked)}
            />
            <span>Also delete all models and subfolders inside</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setDeleteModal({ isOpen: false, folder: null })}
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
    </div>
  );
};
