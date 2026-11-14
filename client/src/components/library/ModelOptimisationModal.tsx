import React, { useEffect, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import type { LibraryModel } from '@shared/types/model';
import { Modal } from '../common/Modal';
import { useLibraryStore } from '../../store/libraryStore';

interface ModelOptimisationModalProps {
  model: LibraryModel | null;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  fontSize: '12px',
  outline: 'none',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ModelOptimisationModal: React.FC<ModelOptimisationModalProps> = ({
  model,
  onClose,
}) => {
  const { appSettings, optimiseModel, revertModel, showToast } = useLibraryStore();

  const [maxTextureSize, setMaxTextureSize] = useState(appSettings.optimisation.maxTextureSize);
  const [webpQuality, setWebpQuality] = useState(appSettings.optimisation.webpQuality);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!model) return;
    setMaxTextureSize(model.optimisation?.maxTextureSize ?? appSettings.optimisation.maxTextureSize);
    setWebpQuality(model.optimisation?.webpQuality ?? appSettings.optimisation.webpQuality);
  }, [model, appSettings.optimisation.maxTextureSize, appSettings.optimisation.webpQuality]);

  if (!model) return null;

  const opt = model.optimisation;
  const isOptimised = Boolean(opt?.optimised);
  const savedPct =
    opt && opt.originalSizeBytes > 0
      ? Math.round((1 - opt.optimisedSizeBytes / opt.originalSizeBytes) * 100)
      : 0;

  const handleOptimise = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await optimiseModel(model.id, {
        maxTextureSize: Number(maxTextureSize) || 2048,
        webpQuality: Math.min(100, Math.max(10, Number(webpQuality) || 82)),
      });
      const after = updated.optimisation;
      if (after) {
        const pct =
          after.originalSizeBytes > 0
            ? Math.round((1 - after.optimisedSizeBytes / after.originalSizeBytes) * 100)
            : 0;
        showToast(
          `Optimised "${model.name}": ${formatBytes(after.originalSizeBytes)} → ${formatBytes(after.optimisedSizeBytes)} (${pct >= 0 ? `-${pct}%` : `+${-pct}%`})`,
          'success'
        );
      } else {
        showToast(`Optimised "${model.name}"`, 'success');
      }
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to optimise GLB', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    setBusy(true);
    try {
      const updated = await revertModel(model.id);
      showToast(
        `Reverted "${model.name}" to original (${formatBytes(updated.sizeBytes)})`,
        'success'
      );
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to revert model', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={Boolean(model)} onClose={onClose} title={`GLB Optimisation: ${model.name}`}>
      <form onSubmit={handleOptimise} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {isOptimised && opt ? (
            <>
              <div style={{ fontWeight: 600, color: '#22c55e' }}>
                Optimised (Meshopt + WebP textures)
              </div>
              <div style={{ color: 'var(--text-main)' }}>
                Before: <strong>{formatBytes(opt.originalSizeBytes)}</strong> → After:{' '}
                <strong>{formatBytes(opt.optimisedSizeBytes)}</strong>{' '}
                <span style={{ color: savedPct >= 0 ? '#22c55e' : 'var(--text-muted)' }}>
                  ({savedPct >= 0 ? `${savedPct}% smaller` : `${-savedPct}% larger`})
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Original file preserved on disk — you can re-optimise from the original or revert any time.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Original (Un-optimised)</div>
              <div style={{ color: 'var(--text-muted)' }}>
                Current file size: <strong>{formatBytes(model.sizeBytes)}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Applies Meshopt geometry compression (no Draco), resizes large textures, and converts textures to WebP while keeping the original file.
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Max texture dimension (px)
            </label>
            <select
              value={maxTextureSize}
              onChange={(e) => setMaxTextureSize(Number(e.target.value))}
              style={inputStyle}
            >
              <option value={512}>512 px</option>
              <option value={1024}>1024 px</option>
              <option value={2048}>2048 px</option>
              <option value={4096}>4096 px</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              WebP quality (10–100)
            </label>
            <input
              type="number"
              min={10}
              max={100}
              value={webpQuality}
              onChange={(e) => setWebpQuality(parseInt(e.target.value, 10) || 82)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px' }}>
          {isOptimised ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleRevert}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                color: '#fca5a5',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
              }}
            >
              <RotateCcw size={13} />
              Revert to Original
            </button>
          ) : (
            <span />
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '4px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
              }}
            >
              <Sparkles size={13} />
              {busy ? 'Optimising...' : isOptimised ? 'Re-optimise GLB' : 'Optimise GLB'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
