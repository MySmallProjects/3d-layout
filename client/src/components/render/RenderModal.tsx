import React, { useEffect, useRef, useState } from 'react';
import { Camera, Crosshair, Download, Image as ImageIcon, XCircle } from 'lucide-react';
import type { HdriRecord, LightingPresetRecord } from '@shared/types/lighting';
import type { RenderRecord, ResolutionPreset, ToneMappingMode } from '@shared/types/render';
import { Modal } from '../common/Modal';
import { BUILTIN_LIGHTING_PRESETS } from '../../constants/lightingPresets';
import { useSceneStore } from '../../store/sceneStore';
import { useLibraryStore } from '../../store/libraryStore';
import { fetchCustomPresets, fetchHdris } from '../../api/lighting';
import { createRenderApi } from '../../api/renders';
import { renderSceneOffscreen } from '../../utils/offscreenRenderer';

interface RenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGallery: () => void;
  autoStart?: boolean;
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

export const RenderModal: React.FC<RenderModalProps> = ({
  isOpen,
  onClose,
  onOpenGallery,
  autoStart = false,
}) => {
  const {
    objects,
    selectedObjectIds,
    background,
    currentSceneId,
    currentSceneName,
    lighting,
    renderSettings,
    setLighting,
    setRenderSettings,
  } = useSceneStore();
  const { showToast } = useLibraryStore();

  const [renderName, setRenderName] = useState('');
  const [customPresets, setCustomPresets] = useState<LightingPresetRecord[]>([]);
  const [hdris, setHdris] = useState<HdriRecord[]>([]);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completedRender, setCompletedRender] = useState<RenderRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRenderName(`${currentSceneName} Render`);
    setError(null);
    setCompletedRender(null);
    fetchCustomPresets().then(setCustomPresets).catch(() => {});
    fetchHdris().then(setHdris).catch(() => {});
  }, [isOpen, currentSceneName]);

  const handleResolutionPreset = (preset: ResolutionPreset) => {
    const dims: Record<ResolutionPreset, [number, number]> = {
      '1080p': [1920, 1080],
      '4k': [3840, 2160],
      square: [1080, 1080],
      custom: [renderSettings.width, renderSettings.height],
    };
    const [w, h] = dims[preset];
    setRenderSettings({ resolutionPreset: preset, width: w, height: h });
  };

  const handleFocusSelectedObject = () => {
    const selId = selectedObjectIds[0];
    if (!selId) {
      showToast('Select an object in the scene first.', 'info');
      return;
    }
    const obj = objects.find((o) => o.id === selId);
    if (!obj) return;

    const getCam = (window as any).__getCameraState as (() => { position: [number, number, number] }) | undefined;
    const camPos = getCam ? getCam().position : useSceneStore.getState().cameraState.position;
    const dx = obj.position[0] - camPos[0];
    const dy = obj.position[1] - camPos[1];
    const dz = obj.position[2] - camPos[2];
    const dist = Math.max(0.5, parseFloat(Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2)));
    setRenderSettings({ dofEnabled: true, dofFocusDistance: dist });
    showToast(`Focus distance set to ${dist}m (${obj.name})`, 'info');
  };

  const handleStartRender = async () => {
    if (rendering) return;
    setError(null);
    setCompletedRender(null);
    setRendering(true);
    setProgress(0);
    setStage('Starting...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const getCam = (window as any).__getCameraState as
        | (() => { position: [number, number, number]; target: [number, number, number] })
        | undefined;
      const liveCam = getCam ? getCam() : useSceneStore.getState().cameraState;

      const latestHdriList = hdris.length > 0 ? hdris : await fetchHdris().catch(() => []);
      const settingsSnapshot = { ...renderSettings, lighting };

      const output = await renderSceneOffscreen({
        objects,
        background,
        cameraState: liveCam,
        settings: settingsSnapshot,
        hdris: latestHdriList,
        signal: controller.signal,
        onProgress: (pct, st) => {
          setProgress(pct);
          setStage(st);
        },
      });

      setStage('Saving to gallery...');
      const saved = await createRenderApi({
        name: renderName.trim() || `${currentSceneName} Render`,
        sceneId: currentSceneId,
        sceneName: currentSceneName,
        width: output.width,
        height: output.height,
        settings: settingsSnapshot,
        camera: liveCam,
        imageDataUrl: output.imageDataUrl,
        thumbnailDataUrl: output.thumbnailDataUrl,
      });

      setCompletedRender(saved);
      showToast('Render saved to gallery!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Render failed';
      setError(msg);
    } finally {
      setRendering(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && autoStart && !rendering && !completedRender) {
      handleStartRender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoStart]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!rendering) onClose(); }} title="High-Quality Render" width="580px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
        {error && (
          <div style={{ padding: '8px 10px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.35)' }}>
            {error}
          </div>
        )}

        {/* Name & Resolution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={{ color: 'var(--text-muted)' }}>
            Render Name
            <input
              type="text"
              value={renderName}
              onChange={(e) => setRenderName(e.target.value)}
              style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
            />
          </label>
          <label style={{ color: 'var(--text-muted)' }}>
            Resolution
            <select
              value={renderSettings.resolutionPreset}
              onChange={(e) => handleResolutionPreset(e.target.value as ResolutionPreset)}
              style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
            >
              <option value="1080p">1080p (1920 × 1080)</option>
              <option value="4k">4K UHD (3840 × 2160)</option>
              <option value="square">Square (1080 × 1080)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        {renderSettings.resolutionPreset === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ color: 'var(--text-muted)' }}>
              Width (px)
              <input
                type="number"
                min={64}
                max={8192}
                value={renderSettings.width}
                onChange={(e) => setRenderSettings({ width: Math.max(64, parseInt(e.target.value, 10) || 1920) })}
                style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
              />
            </label>
            <label style={{ color: 'var(--text-muted)' }}>
              Height (px)
              <input
                type="number"
                min={64}
                max={8192}
                value={renderSettings.height}
                onChange={(e) => setRenderSettings({ height: Math.max(64, parseInt(e.target.value, 10) || 1080) })}
                style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
              />
            </label>
          </div>
        )}

        {/* Quality, FOV, Tone Mapping, Exposure */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <label style={{ color: 'var(--text-muted)' }}>
            AA Samples
            <select
              value={renderSettings.samples}
              onChange={(e) => setRenderSettings({ samples: parseInt(e.target.value, 10) as 1 | 2 | 4 | 8 })}
              style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
            >
              <option value={1}>1x (Fast)</option>
              <option value={2}>2x (Balanced)</option>
              <option value={4}>4x (High)</option>
              <option value={8}>8x (Ultra)</option>
            </select>
          </label>
          <label style={{ color: 'var(--text-muted)' }}>
            Tone Mapping
            <select
              value={renderSettings.toneMapping}
              onChange={(e) => setRenderSettings({ toneMapping: e.target.value as ToneMappingMode })}
              style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
            >
              <option value="ACESFilmic">ACES Filmic</option>
              <option value="AgX">AgX</option>
              <option value="Reinhard">Reinhard</option>
              <option value="None">None</option>
            </select>
          </label>
          <label style={{ color: 'var(--text-muted)' }}>
            Lighting Preset
            <select
              value={lighting.presetId}
              onChange={(e) => {
                const b = BUILTIN_LIGHTING_PRESETS.find((p) => p.presetId === e.target.value);
                if (b) { setLighting({ ...b, hdriId: lighting.hdriId, hdriAsBackground: lighting.hdriAsBackground, hdriIntensity: lighting.hdriIntensity }); return; }
                const c = customPresets.find((p) => p.id === e.target.value);
                if (c) setLighting({ ...c.config });
              }}
              style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
            >
              {BUILTIN_LIGHTING_PRESETS.map((p) => (
                <option key={p.presetId} value={p.presetId}>{p.presetName}</option>
              ))}
              {customPresets.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Custom)</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={{ color: 'var(--text-muted)' }}>
            Camera FOV ({renderSettings.fov}°)
            <input
              type="range"
              min={20}
              max={90}
              step={1}
              value={renderSettings.fov}
              onChange={(e) => setRenderSettings({ fov: parseInt(e.target.value, 10) })}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ color: 'var(--text-muted)' }}>
            Exposure ({renderSettings.exposure.toFixed(2)})
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={renderSettings.exposure}
              onChange={(e) => setRenderSettings({ exposure: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>
        </div>

        {/* Depth of Field */}
        <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: renderSettings.dofEnabled ? '8px' : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={renderSettings.dofEnabled}
                onChange={(e) => setRenderSettings({ dofEnabled: e.target.checked })}
              />
              <span>Depth of Field (Bokeh)</span>
            </label>
            <button
              type="button"
              onClick={handleFocusSelectedObject}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
              }}
            >
              <Crosshair size={12} />
              Focus Selected Object
            </button>
          </div>
          {renderSettings.dofEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: 'var(--text-muted)' }}>
              <label>
                Focus Distance ({renderSettings.dofFocusDistance}m)
                <input
                  type="range"
                  min={0.5}
                  max={50}
                  step={0.1}
                  value={renderSettings.dofFocusDistance}
                  onChange={(e) => setRenderSettings({ dofFocusDistance: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Aperture ({renderSettings.dofAperture.toFixed(4)})
                <input
                  type="range"
                  min={0.0002}
                  max={0.01}
                  step={0.0002}
                  value={renderSettings.dofAperture}
                  onChange={(e) => setRenderSettings({ dofAperture: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '4px 2px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={renderSettings.transparentBg}
              onChange={(e) => setRenderSettings({ transparentBg: e.target.checked })}
            />
            Transparent PNG Background
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={renderSettings.ssaoEnabled}
              onChange={(e) => setRenderSettings({ ssaoEnabled: e.target.checked })}
            />
            Ambient Occlusion (SSAO)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={renderSettings.groundPlaneEnabled}
              onChange={(e) => setRenderSettings({ groundPlaneEnabled: e.target.checked })}
            />
            Ground Shadows
          </label>
        </div>

        {/* Progress Bar */}
        {rendering && (
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.15s ease' }} />
            </div>
          </div>
        )}

        {/* Completed Preview */}
        {completedRender && (
          <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--success)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <img
              src={`/api/renders/${completedRender.id}/thumbnail`}
              alt={completedRender.name}
              style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '4px', backgroundColor: 'var(--bg-app)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6ee7b7' }}>
                Saved {completedRender.width}×{completedRender.height} PNG
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`/api/renders/${completedRender.id}/file`}
                  download={`${completedRender.name}.png`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} />
                  Download
                </a>
                <button
                  onClick={() => { onClose(); onOpenGallery(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '4px',
                  }}
                >
                  <ImageIcon size={13} />
                  View in Gallery
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          {rendering ? (
            <button
              onClick={handleCancel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                borderRadius: '4px',
              }}
            >
              <XCircle size={14} />
              Cancel Render
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '7px 14px',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                }}
              >
                Close
              </button>
              <button
                onClick={handleStartRender}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  borderRadius: '4px',
                }}
              >
                <Camera size={14} />
                Start Render
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
