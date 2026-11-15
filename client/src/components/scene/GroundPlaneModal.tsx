import React, { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, Check, Layers } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useSceneStore } from '../../store/sceneStore';
import {
  fetchBackgrounds,
  uploadBackgroundApi,
  deleteBackgroundApi,
} from '../../api/backgrounds';
import { BackgroundItem } from '../../types';
import type { GroundPlaneType } from '@shared/types/scene';

interface GroundPlaneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#22252e',
  '#111827',
  '#374151',
  '#6b7280',
  '#d1d5db',
  '#f3f4f6',
  '#78350f',
  '#14532d',
  '#1e3a8a',
];

const GROUND_MODES: { value: GroundPlaneType; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'No ground plane in viewport or renders' },
  {
    value: 'shadow-catcher',
    label: 'Shadow Catcher',
    desc: 'Invisible floor that receives shadows (works with transparent backgrounds)',
  },
  { value: 'color', label: 'Solid Colour', desc: 'Matte solid-coloured ground plane' },
  { value: 'image', label: 'Image Texture', desc: 'Tiled image texture ground plane' },
];

export const GroundPlaneModal: React.FC<GroundPlaneModalProps> = ({ isOpen, onClose }) => {
  const groundPlane = useSceneStore((s) => s.groundPlane);
  const setGroundPlane = useSceneStore((s) => s.setGroundPlane);
  const setRenderSettings = useSceneStore((s) => s.setRenderSettings);

  const [images, setImages] = useState<BackgroundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await fetchBackgrounds();
      setImages(res.backgrounds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load textures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadImages();
    }
  }, [isOpen]);

  const handleTypeChange = (type: GroundPlaneType) => {
    setGroundPlane({ type });
    setRenderSettings({
      groundPlaneEnabled: type !== 'none' && groundPlane.visible,
      groundShadowOnly: type === 'shadow-catcher',
      groundColor: groundPlane.color || '#22252e',
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const item = await uploadBackgroundApi(file);
      setImages((prev) => [item, ...prev]);
      setGroundPlane({ type: 'image', imagePath: item.id, visible: true });
      setRenderSettings({ groundPlaneEnabled: true, groundShadowOnly: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteBackgroundApi(id);
      setImages((prev) => prev.filter((item) => item.id !== id));
      if (groundPlane.imagePath === id) {
        setGroundPlane({ imagePath: undefined });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ground Plane" width="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
        {error && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              fontSize: '12px',
            }}
          >
            {error}
          </div>
        )}

        {/* Mode selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {GROUND_MODES.map((mode) => {
            const active = groundPlane.type === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => handleTypeChange(mode.value)}
                title={mode.desc}
                style={{
                  padding: '8px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: active ? 'var(--accent)' : 'var(--bg-panel)',
                  color: active ? '#fff' : 'var(--text-main)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {GROUND_MODES.find((m) => m.value === groundPlane.type)?.desc}
        </div>

        {/* Visibility and Size controls */}
        {groundPlane.type !== 'none' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '10px 12px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={groundPlane.visible}
                onChange={(e) => {
                  const vis = e.target.checked;
                  setGroundPlane({ visible: vis });
                  setRenderSettings({ groundPlaneEnabled: vis });
                }}
              />
              Visible
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Size: {groundPlane.size} m
              </span>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={groundPlane.size}
                onChange={(e) => setGroundPlane({ size: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
            </label>
          </div>
        )}

        {/* Solid Colour options */}
        {groundPlane.type === 'color' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {PRESET_COLORS.map((c) => {
                const selected = (groundPlane.color || '#22252e').toLowerCase() === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setGroundPlane({ color: c });
                      setRenderSettings({ groundColor: c });
                    }}
                    title={c}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      backgroundColor: c,
                      border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  />
                );
              })}
              <input
                type="color"
                value={groundPlane.color || '#22252e'}
                onChange={(e) => {
                  setGroundPlane({ color: e.target.value });
                  setRenderSettings({ groundColor: e.target.value });
                }}
                style={{ width: '36px', height: '28px', border: 'none', background: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Image Texture options */}
        {groundPlane.type === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Tile Repeat: {groundPlane.textureRepeat ?? 1}x
                </span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={groundPlane.textureRepeat ?? 1}
                  onChange={(e) => setGroundPlane({ textureRepeat: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Upload Texture'}
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading textures...</div>
            ) : images.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '12px 0' }}>
                No image textures yet. Upload a PNG, JPG, or WebP image above.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {images.map((item) => {
                  const selected = groundPlane.imagePath === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setGroundPlane({ imagePath: item.id, type: 'image' })}
                      style={{
                        position: 'relative',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        aspectRatio: '16/10',
                        background: '#0f1117',
                      }}
                    >
                      <img
                        src={`/api/backgrounds/${encodeURIComponent(item.id)}/file`}
                        alt="Ground texture"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {selected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: 'var(--accent)',
                            borderRadius: '50%',
                            padding: '2px',
                            display: 'flex',
                          }}
                        >
                          <Check size={12} color="#fff" />
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete texture"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(0,0,0,0.65)',
                          borderRadius: '4px',
                          padding: '3px',
                          color: '#ef4444',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '4px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              fontSize: '12px',
            }}
          >
            <Layers size={13} />
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
