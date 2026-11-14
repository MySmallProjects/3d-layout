import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, Save, Sparkles } from 'lucide-react';
import { fetchAppSettings, updateAppSettingsApi } from '../../api/settings';
import { fetchModels, optimiseModelApi, revertModelApi } from '../../api/models';
import { invalidateGltfCache } from '../viewport/SceneObjectRenderer';
import { DEFAULT_APP_SETTINGS } from '../../types';

interface OptimisationAdminSectionProps {
  cardStyle: React.CSSProperties;
  onStatus: (msg: { type: 'success' | 'error' | 'info'; text: string }) => void;
  onModelsChanged?: () => void;
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const OptimisationAdminSection: React.FC<OptimisationAdminSectionProps> = ({
  cardStyle,
  onStatus,
  onModelsChanged,
}) => {
  const [enabledOnUpload, setEnabledOnUpload] = useState(
    DEFAULT_APP_SETTINGS.optimisation.enabledOnUpload
  );
  const [maxTextureSize, setMaxTextureSize] = useState(
    DEFAULT_APP_SETTINGS.optimisation.maxTextureSize
  );
  const [webpQuality, setWebpQuality] = useState(
    DEFAULT_APP_SETTINGS.optimisation.webpQuality
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    action: string;
    done: number;
    total: number;
    currentName: string;
  } | null>(null);

  useEffect(() => {
    fetchAppSettings()
      .then((s) => {
        setEnabledOnUpload(s.optimisation.enabledOnUpload);
        setMaxTextureSize(s.optimisation.maxTextureSize);
        setWebpQuality(s.optimisation.webpQuality);
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateAppSettingsApi({
        optimisation: {
          enabledOnUpload,
          maxTextureSize: Number(maxTextureSize) || 2048,
          webpQuality: Math.min(100, Math.max(10, Number(webpQuality) || 82)),
        },
      });
      setEnabledOnUpload(updated.optimisation.enabledOnUpload);
      setMaxTextureSize(updated.optimisation.maxTextureSize);
      setWebpQuality(updated.optimisation.webpQuality);
      onStatus({ type: 'success', text: 'GLB optimisation settings saved.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save optimisation settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBulkOptimise = async (onlyUnoptimised: boolean) => {
    try {
      const res = await fetchModels();
      const targets = onlyUnoptimised
        ? res.models.filter((m) => !m.optimisation?.optimised)
        : res.models;

      if (targets.length === 0) {
        onStatus({ type: 'info', text: 'All library models are already optimised.' });
        return;
      }

      const opts = {
        maxTextureSize: Number(maxTextureSize) || 2048,
        webpQuality: Math.min(100, Math.max(10, Number(webpQuality) || 82)),
      };
      let succeeded = 0;
      let failed = 0;
      let beforeTotal = 0;
      let afterTotal = 0;

      for (let i = 0; i < targets.length; i++) {
        const model = targets[i];
        setBulkProgress({
          action: 'Optimising',
          done: i,
          total: targets.length,
          currentName: model.name,
        });
        try {
          const updated = await optimiseModelApi(model.id, opts);
          invalidateGltfCache(model.id);
          beforeTotal += updated.optimisation?.originalSizeBytes ?? model.sizeBytes;
          afterTotal += updated.sizeBytes;
          succeeded++;
        } catch (err) {
          console.warn(`Failed to optimise ${model.name}:`, err);
          failed++;
        }
      }

      setBulkProgress(null);
      onModelsChanged?.();
      const savedBytes = Math.max(0, beforeTotal - afterTotal);
      onStatus({
        type: failed > 0 ? 'info' : 'success',
        text:
          `Optimised ${succeeded} model${succeeded === 1 ? '' : 's'} (${formatMb(beforeTotal)} → ${formatMb(afterTotal)}, saved ${formatMb(savedBytes)})` +
          (failed > 0 ? `, ${failed} failed` : '') +
          '.',
      });
    } catch (err) {
      setBulkProgress(null);
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk optimisation failed',
      });
    }
  };

  const handleBulkRevert = async () => {
    try {
      const res = await fetchModels();
      const targets = res.models.filter((m) => m.optimisation?.optimised);

      if (targets.length === 0) {
        onStatus({ type: 'info', text: 'No optimised models to revert.' });
        return;
      }

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < targets.length; i++) {
        const model = targets[i];
        setBulkProgress({
          action: 'Reverting',
          done: i,
          total: targets.length,
          currentName: model.name,
        });
        try {
          await revertModelApi(model.id);
          invalidateGltfCache(model.id);
          succeeded++;
        } catch (err) {
          console.warn(`Failed to revert ${model.name}:`, err);
          failed++;
        }
      }

      setBulkProgress(null);
      onModelsChanged?.();
      onStatus({
        type: failed > 0 ? 'info' : 'success',
        text: `Reverted ${succeeded} model${succeeded === 1 ? '' : 's'} to original${failed > 0 ? `, ${failed} failed` : ''}.`,
      });
    } catch (err) {
      setBulkProgress(null);
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk revert failed',
      });
    }
  };

  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={16} />
        GLB Optimisation (Meshopt + WebP)
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Compresses meshes with Meshopt (no Draco), resizes large textures, and converts textures to WebP. Original GLBs are kept so any model can be reverted.
      </p>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '14px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', paddingBottom: '6px' }}>
          <input
            type="checkbox"
            checked={enabledOnUpload}
            onChange={(e) => setEnabledOnUpload(e.target.checked)}
          />
          Optimise uploaded GLBs automatically
        </label>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Max texture size (px)
          </label>
          <select
            value={maxTextureSize}
            onChange={(e) => setMaxTextureSize(Number(e.target.value))}
            style={{
              width: '120px',
              padding: '5px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
            }}
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
            style={{
              width: '90px',
              padding: '5px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={savingSettings}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: '5px',
          }}
        >
          <Save size={14} />
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <button
          type="button"
          disabled={bulkProgress !== null}
          onClick={() => handleBulkOptimise(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '5px',
          }}
        >
          <Sparkles size={13} />
          Optimise Un-optimised Models
        </button>
        <button
          type="button"
          disabled={bulkProgress !== null}
          onClick={() => handleBulkOptimise(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '5px',
          }}
        >
          <RefreshCw size={13} className={bulkProgress ? 'animate-spin' : ''} />
          Re-optimise All Models
        </button>
        <button
          type="button"
          disabled={bulkProgress !== null}
          onClick={handleBulkRevert}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            color: '#fca5a5',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '5px',
          }}
        >
          <RotateCcw size={13} />
          Revert All to Originals
        </button>
      </div>

      {bulkProgress && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>
              {bulkProgress.action}: {bulkProgress.currentName}
            </span>
            <span>
              {bulkProgress.done} / {bulkProgress.total}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`,
                height: '100%',
                backgroundColor: 'var(--accent)',
                transition: 'width 0.15s ease',
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
