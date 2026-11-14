import React, { useEffect, useRef, useState } from 'react';
import { Sun, Upload, Trash2, Save } from 'lucide-react';
import type { DirectionalLightConfig, HdriRecord, LightingPresetRecord } from '@shared/types/lighting';
import { Modal } from '../common/Modal';
import { BUILTIN_LIGHTING_PRESETS } from '../../constants/lightingPresets';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import {
  createCustomPresetApi,
  deleteCustomPresetApi,
  deleteHdriApi,
  fetchCustomPresets,
  fetchHdris,
  uploadHdriApi,
} from '../../api/lighting';

interface LightingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '5px 8px',
  fontSize: '12px',
  outline: 'none',
};

export const LightingModal: React.FC<LightingModalProps> = ({ isOpen, onClose }) => {
  const lighting = useSceneStore((s) => s.lighting);
  const setLighting = useSceneStore((s) => s.setLighting);
  const { showToast } = useLibraryStore();

  const [customPresets, setCustomPresets] = useState<LightingPresetRecord[]>([]);
  const [hdris, setHdris] = useState<HdriRecord[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [uploadingHdri, setUploadingHdri] = useState(false);
  const hdriInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchCustomPresets().then(setCustomPresets).catch(() => {});
    fetchHdris().then(setHdris).catch(() => {});
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    const builtin = BUILTIN_LIGHTING_PRESETS.find((p) => p.presetId === presetId);
    if (builtin) {
      setLighting({ ...builtin, hdriId: lighting.hdriId, hdriAsBackground: lighting.hdriAsBackground, hdriIntensity: lighting.hdriIntensity });
      return;
    }
    const custom = customPresets.find((p) => p.id === presetId);
    if (custom) {
      setLighting({ ...custom.config });
    }
  };

  const handleSaveCustomPreset = async () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    try {
      const created = await createCustomPresetApi(trimmed, lighting);
      setCustomPresets((prev) => [created, ...prev]);
      setLighting(created.config);
      setNewPresetName('');
      showToast(`Saved lighting preset "${created.name}"`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save preset', 'error');
    }
  };

  const handleDeleteCustomPreset = async (id: string) => {
    try {
      await deleteCustomPresetApi(id);
      setCustomPresets((prev) => prev.filter((p) => p.id !== id));
      showToast('Deleted custom preset', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete preset', 'error');
    }
  };

  const handleUploadHdri = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingHdri(true);
    try {
      const rec = await uploadHdriApi(file);
      setHdris((prev) => [rec, ...prev]);
      setLighting({ ...lighting, hdriId: rec.id });
      showToast(`Uploaded HDRI "${rec.name}"`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload HDRI', 'error');
    } finally {
      setUploadingHdri(false);
    }
  };

  const handleDeleteHdri = async (id: string) => {
    try {
      await deleteHdriApi(id);
      setHdris((prev) => prev.filter((h) => h.id !== id));
      if (lighting.hdriId === id) {
        setLighting({ ...lighting, hdriId: null });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete HDRI', 'error');
    }
  };

  const updateLight = (which: 'keyLight' | 'fillLight' | 'rimLight', patch: Partial<DirectionalLightConfig>) => {
    setLighting({
      ...lighting,
      [which]: { ...lighting[which], ...patch },
    });
  };

  const renderLightSection = (title: string, which: 'keyLight' | 'fillLight' | 'rimLight', cfg: DirectionalLightConfig) => (
    <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '12px' }}>{title}</strong>
        <input
          type="color"
          value={cfg.color}
          onChange={(e) => updateLight(which, { color: e.target.value })}
          style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <label>
          Intensity ({cfg.intensity.toFixed(2)})
          <input type="range" min={0} max={5} step={0.05} value={cfg.intensity} onChange={(e) => updateLight(which, { intensity: parseFloat(e.target.value) })} style={{ width: '100%' }} />
        </label>
        <label>
          Azimuth ({cfg.azimuthDeg}°)
          <input type="range" min={-180} max={180} step={1} value={cfg.azimuthDeg} onChange={(e) => updateLight(which, { azimuthDeg: parseInt(e.target.value, 10) })} style={{ width: '100%' }} />
        </label>
        <label>
          Elevation ({cfg.elevationDeg}°)
          <input type="range" min={0} max={90} step={1} value={cfg.elevationDeg} onChange={(e) => updateLight(which, { elevationDeg: parseInt(e.target.value, 10) })} style={{ width: '100%' }} />
        </label>
      </div>
    </div>
  );

  const isCustomSelected = customPresets.some((p) => p.id === lighting.presetId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lighting & Environment" width="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Preset Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Sun size={15} color="var(--accent)" />
          <select
            value={lighting.presetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <optgroup label="Built-in Presets">
              {BUILTIN_LIGHTING_PRESETS.map((p) => (
                <option key={p.presetId} value={p.presetId}>{p.presetName}</option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="Custom Presets">
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          {isCustomSelected && (
            <button
              onClick={() => handleDeleteCustomPreset(lighting.presetId)}
              title="Delete custom preset"
              style={{ padding: '6px', color: '#f87171', backgroundColor: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Save as Custom Preset */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Save current settings as custom preset..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleSaveCustomPreset}
            disabled={!newPresetName.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '4px',
              opacity: newPresetName.trim() ? 1 : 0.5,
            }}
          >
            <Save size={13} />
            Save Preset
          </button>
        </div>

        {/* Ambient */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
          <span style={{ minWidth: '105px' }}>Ambient ({lighting.ambientIntensity.toFixed(2)})</span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={lighting.ambientIntensity}
            onChange={(e) => setLighting({ ...lighting, ambientIntensity: parseFloat(e.target.value) })}
            style={{ flex: 1 }}
          />
          <input
            type="color"
            value={lighting.ambientColor}
            onChange={(e) => setLighting({ ...lighting, ambientColor: e.target.value })}
            style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer' }}
          />
        </div>

        {/* 3-Point Lights */}
        {renderLightSection('Key Light', 'keyLight', lighting.keyLight)}
        {renderLightSection('Fill Light', 'fillLight', lighting.fillLight)}
        {renderLightSection('Rim Light', 'rimLight', lighting.rimLight)}

        {/* HDRI Environment */}
        <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '12px' }}>HDRI Environment (.hdr / .exr)</strong>
            <div>
              <input ref={hdriInputRef} type="file" accept=".hdr,.exr" style={{ display: 'none' }} onChange={handleUploadHdri} />
              <button
                onClick={() => hdriInputRef.current?.click()}
                disabled={uploadingHdri}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}
              >
                <Upload size={12} />
                {uploadingHdri ? 'Uploading...' : 'Upload HDRI'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={lighting.hdriId || ''}
              onChange={(e) => setLighting({ ...lighting, hdriId: e.target.value || null })}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">None (No HDRI)</option>
              {hdris.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            {lighting.hdriId && (
              <button
                onClick={() => handleDeleteHdri(lighting.hdriId!)}
                title="Delete selected HDRI"
                style={{ padding: '5px', color: '#f87171' }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {lighting.hdriId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={lighting.hdriAsBackground}
                  onChange={(e) => setLighting({ ...lighting, hdriAsBackground: e.target.checked })}
                />
                Use HDRI as background
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                Intensity ({lighting.hdriIntensity.toFixed(2)})
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={lighting.hdriIntensity}
                  onChange={(e) => setLighting({ ...lighting, hdriIntensity: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
