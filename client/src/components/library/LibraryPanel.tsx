import React from 'react';
import { FolderTree } from './FolderTree';
import { ModelGrid } from './ModelGrid';
import { UploadZone } from './UploadZone';
import { useLibraryStore } from '../../store/libraryStore';

export const LibraryPanel: React.FC = () => {
  const { models } = useLibraryStore();

  return (
    <aside
      style={{
        width: '320px',
        minWidth: '260px',
        maxWidth: '400px',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Panel Header */}
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
        <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em' }}>
          ASSET LIBRARY
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {models.length} model{models.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Upload Zone */}
      <UploadZone />

      {/* Folder Tree */}
      <FolderTree />

      {/* Models Grid */}
      <ModelGrid />
    </aside>
  );
};
