import React, { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';

export const UploadZone: React.FC = () => {
  const { uploadFiles, uploadProgress, showToast, selectedFolderId } = useLibraryStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.glb')) {
        files.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      showToast(`Only .glb files are accepted. Ignored: ${invalidFiles.join(', ')}`, 'error');
    }

    if (files.length > 0) {
      uploadFiles(files, selectedFolderId === undefined ? null : selectedFolderId);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        padding: '10px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        transition: 'all 0.2s ease'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!!uploadProgress}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px',
          backgroundColor: isDragging ? 'var(--accent)' : 'var(--bg-card)',
          color: 'var(--text-main)',
          border: '1px dashed var(--border-color)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
          transition: 'all 0.2s ease'
        }}
      >
        {uploadProgress ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload size={14} color="var(--accent)" />
            <span>Upload GLB models</span>
          </>
        )}
      </button>

      {uploadProgress && (
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              height: '4px',
              backgroundColor: 'var(--bg-input)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--accent)',
                width: '100%',
                animation: 'pulse 1.5s infinite'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
