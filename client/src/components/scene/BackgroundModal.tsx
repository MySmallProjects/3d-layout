import React, { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, Check, Image as ImageIcon, Palette, Ban, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { BackgroundItem } from '../../types';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import {
  fetchBackgrounds,
  uploadBackgroundApi,
  deleteBackgroundApi
} from '../../api/backgrounds';

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#1a1c23',
  '#121316',
  '#252836',
  '#0f172a',
  '#2a2a2a',
  '#3f3f46',
  '#71717a',
  '#e2e8f0',
  '#ffffff'
];

export const BackgroundModal: React.FC<BackgroundModalProps> = ({ isOpen, onClose }) => {
  const { background, setBackground } = useSceneStore();
  const { showToast } = useLibraryStore();

  const [tab, setTab] = useState<'color' | 'image' | 'none'>(background.type);
  const [selectedColor, setSelectedColor] = useState(background.color || '#1a1c23');
  const [backgroundsList, setBackgroundsList] = useState<BackgroundItem[]>([]);
  const [selectedBgId, setSelectedBgId] = useState<string | null>(background.imagePath || null);
  const [isEquirectangular, setIsEquirectangular] = useState(!!background.equirectangular);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(background.type);
      setSelectedColor(background.color || '#1a1c23');
      setSelectedBgId(background.imagePath || null);
      setIsEquirectangular(!!background.equirectangular);
      loadBackgrounds();
    }
  }, [isOpen, background]);

  const loadBackgrounds = async () => {
    try {
      const res = await fetchBackgrounds();
      setBackgroundsList(res.backgrounds);
    } catch (err: unknown) {
      console.error('Failed to load backgrounds:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const item = await uploadBackgroundApi(file);
      await loadBackgrounds();
      setSelectedBgId(item.id);
      showToast('Background uploaded', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteBg = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteBackgroundApi(id);
      if (selectedBgId === id) setSelectedBgId(null);
      await loadBackgrounds();
      showToast('Background deleted', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      showToast(msg, 'error');
    }
  };

  const handleApply = () => {
    if (tab === 'none') {
      setBackground({ type: 'none' });
    } else if (tab === 'color') {
      setBackground({ type: 'color', color: selectedColor });
    } else if (tab === 'image') {
      if (!selectedBgId) {
        showToast('Please select an image', 'error');
        return;
      }
      setBackground({
        type: 'image',
        imagePath: selectedBgId,
        equirectangular: isEquirectangular
      });
    }
    onClose();
  };

  return (
    <Modal title="Scene Background" isOpen={isOpen} onClose={onClose} width="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Tab selection */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-input)',
            padding: '4px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            gap: '4px'
          }}
        >
          <button
            onClick={() => setTab('color')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: tab === 'color' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'color' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
          >
            <Palette size={14} />
            <span>Solid Color</span>
          </button>

          <button
            onClick={() => setTab('image')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: tab === 'image' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'image' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
          >
            <ImageIcon size={14} />
            <span>Image / HDRI</span>
          </button>

          <button
            onClick={() => setTab('none')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: tab === 'none' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'none' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
          >
            <Ban size={14} />
            <span>Transparent</span>
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Preset Colors:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: c,
                    border: selectedColor === c ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {selectedColor === c && (
                    <Check size={14} color={c === '#ffffff' ? '#000000' : '#ffffff'} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Custom Hex:</span>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{ width: '40px', height: '28px', border: 'none', cursor: 'pointer', background: 'none' }}
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{
                  width: '90px',
                  padding: '4px 8px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        )}

        {tab === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.hdr,.exr"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'var(--bg-card)',
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--text-main)'
              }}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} color="var(--accent)" />}
              <span>{isUploading ? 'Uploading...' : 'Upload Background Image or HDRI'}</span>
            </button>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available Backgrounds:</div>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '8px'
              }}
            >
              {backgroundsList.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px' }}>
                  No backgrounds uploaded yet
                </div>
              ) : (
                backgroundsList.map((bg) => {
                  const isSelected = selectedBgId === bg.id;
                  return (
                    <div
                      key={bg.id}
                      onClick={() => setSelectedBgId(bg.id)}
                      style={{
                        position: 'relative',
                        height: '75px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-input)'
                      }}
                    >
                      <img
                        src={`/api/backgrounds/${bg.id}/file`}
                        alt={bg.fileName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.7)',
                          padding: '2px 4px',
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {bg.fileName}
                      </div>
                      <button
                        onClick={(e) => handleDeleteBg(bg.id, e)}
                        title="Delete background"
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          padding: '3px',
                          borderRadius: '3px',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'var(--danger)',
                          display: 'flex'
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={isEquirectangular}
                onChange={(e) => setIsEquirectangular(e.target.checked)}
              />
              <span>Equirectangular 360° environment (also illuminates scene)</span>
            </label>
          </div>
        )}

        {tab === 'none' && (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            The 3D canvas background will be transparent.
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '6px 16px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Apply Background
          </button>
        </div>
      </div>
    </Modal>
  );
};
