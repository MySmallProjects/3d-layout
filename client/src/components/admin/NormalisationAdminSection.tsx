import React, { useEffect, useState } from 'react';
import { RefreshCw, Ruler, Save } from 'lucide-react';
import { fetchAppSettings, updateAppSettingsApi } from '../../api/settings';
import { fetchModels, updateModelNormalisationApi } from '../../api/models';
import { computeModelNormalisationFromUrl } from '../../utils/modelNormalisation';
import { DEFAULT_APP_SETTINGS } from '../../types';

interface NormalisationAdminSectionProps {
  cardStyle: React.CSSProperties;
  onStatus: (msg: { type: 'success' | 'error' | 'info'; text: string }) => void;
}

export const NormalisationAdminSection: React.FC<NormalisationAdminSectionProps> = ({
  cardStyle,
  onStatus,
}) => {
  const [enabledByDefault, setEnabledByDefault] = useState(
    DEFAULT_APP_SETTINGS.normalization.enabledByDefault
  );
  const [defaultTargetSize, setDefaultTargetSize] = useState(
    DEFAULT_APP_SETTINGS.normalization.defaultTargetSize
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
    currentName: string;
  } | null>(null);

  useEffect(() => {
    fetchAppSettings()
      .then((s) => {
        setEnabledByDefault(s.normalization.enabledByDefault);
        setDefaultTargetSize(s.normalization.defaultTargetSize);
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await updateAppSettingsApi({
        normalization: {
          enabledByDefault,
          defaultTargetSize: Math.max(0.01, Number(defaultTargetSize) || 2),
        },
      });
      setEnabledByDefault(updated.normalization.enabledByDefault);
      setDefaultTargetSize(updated.normalization.defaultTargetSize);
      onStatus({ type: 'success', text: 'Import normalisation settings saved.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBulkNormalise = async (onlyMissing: boolean) => {
    try {
      const res = await fetchModels();
      const targets = onlyMissing
        ? res.models.filter((m) => !m.normalisation)
        : res.models;

      if (targets.length === 0) {
        onStatus({ type: 'info', text: 'All library models already have normalisation data.' });
        return;
      }

      const targetSize = Math.max(0.01, Number(defaultTargetSize) || 2);
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < targets.length; i++) {
        const model = targets[i];
        setBulkProgress({ done: i, total: targets.length, currentName: model.name });
        try {
          const computed = await computeModelNormalisationFromUrl(
            `/api/models/${model.id}/file`,
            targetSize,
            true
          );
          await updateModelNormalisationApi(model.id, computed);
          succeeded++;
        } catch (err) {
          console.warn(`Failed to normalise ${model.name}:`, err);
          failed++;
        }
      }

      setBulkProgress(null);
      onStatus({
        type: failed === 0 ? 'success' : 'info',
        text: `Bulk normalisation finished: ${succeeded} succeeded${failed > 0 ? `, ${failed} failed` : ''}.`,
      });
    } catch (err) {
      setBulkProgress(null);
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk normalisation failed',
      });
    }
  };

  return (
    <section style={cardStyle}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Ruler size={16} color="var(--accent)" />
        Import Normalisation
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Automatically scale imported GLB models so their largest dimension matches the target size and place their pivot at centre-bottom. Existing saved scene instances stay unchanged.
      </p>

      <form
        onSubmit={handleSaveSettings}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', marginBottom: '14px', fontSize: '13px' }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabledByDefault}
            onChange={(e) => setEnabledByDefault(e.target.checked)}
          />
          Normalise new imports automatically
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)' }}>
          Target largest dimension:
          <input
            type="number"
            step="0.1"
            min="0.01"
            value={defaultTargetSize}
            onChange={(e) => setDefaultTargetSize(parseFloat(e.target.value) || 2)}
            style={{
              width: '84px',
              padding: '5px 8px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={savingSettings || bulkProgress !== null}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: '5px',
            fontWeight: 500,
            fontSize: '13px',
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
          onClick={() => handleBulkNormalise(true)}
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
          Normalise Un-normalised Models
        </button>
        <button
          type="button"
          disabled={bulkProgress !== null}
          onClick={() => handleBulkNormalise(false)}
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
          Re-normalise All Models to {defaultTargetSize}
        </button>
      </div>

      {bulkProgress && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Normalising: {bulkProgress.currentName}</span>
            <span>{bulkProgress.done} / {bulkProgress.total}</span>
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
