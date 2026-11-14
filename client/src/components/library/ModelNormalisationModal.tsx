import React, { useEffect, useState } from 'react';
import { RefreshCw, Ruler } from 'lucide-react';
import type { LibraryModel, ModelNormalisation } from '@shared/types/model';
import { Modal } from '../common/Modal';
import { useLibraryStore } from '../../store/libraryStore';

interface ModelNormalisationModalProps {
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

export const ModelNormalisationModal: React.FC<ModelNormalisationModalProps> = ({
  model,
  onClose,
}) => {
  const { appSettings, updateModelNormalisation, renormaliseModel, showToast } = useLibraryStore();

  const [enabled, setEnabled] = useState(true);
  const [targetSize, setTargetSize] = useState(appSettings.normalization.defaultTargetSize);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [pivotX, setPivotX] = useState(0);
  const [pivotY, setPivotY] = useState(0);
  const [pivotZ, setPivotZ] = useState(0);
  const [rawDims, setRawDims] = useState<[number, number, number] | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!model) return;
    const norm = model.normalisation;
    if (norm) {
      setEnabled(norm.enabled);
      setTargetSize(norm.targetSize);
      setScaleFactor(norm.scaleFactor);
      setPivotX(norm.pivotOffset[0]);
      setPivotY(norm.pivotOffset[1]);
      setPivotZ(norm.pivotOffset[2]);
      setRawDims(norm.rawDimensions);
    } else {
      setEnabled(false);
      setTargetSize(appSettings.normalization.defaultTargetSize);
      setScaleFactor(1);
      setPivotX(0);
      setPivotY(0);
      setPivotZ(0);
      setRawDims(undefined);
    }
  }, [model, appSettings.normalization.defaultTargetSize]);

  if (!model) return null;

  const handleRecompute = async () => {
    setBusy(true);
    try {
      const updated = await renormaliseModel(
        model.id,
        Math.max(0.01, targetSize || appSettings.normalization.defaultTargetSize),
        true
      );
      if (updated.normalisation) {
        setEnabled(updated.normalisation.enabled);
        setTargetSize(updated.normalisation.targetSize);
        setScaleFactor(updated.normalisation.scaleFactor);
        setPivotX(updated.normalisation.pivotOffset[0]);
        setPivotY(updated.normalisation.pivotOffset[1]);
        setPivotZ(updated.normalisation.pivotOffset[2]);
        setRawDims(updated.normalisation.rawDimensions);
      }
      showToast(`Re-normalised "${model.name}"`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to re-normalise model', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: ModelNormalisation = {
        enabled,
        targetSize: Math.max(0.01, Number(targetSize) || 2),
        scaleFactor: Math.max(0.00001, Number(scaleFactor) || 1),
        pivotOffset: [Number(pivotX) || 0, Number(pivotY) || 0, Number(pivotZ) || 0],
        ...(rawDims ? { rawDimensions: rawDims } : {}),
      };
      await updateModelNormalisation(model.id, payload);
      showToast(`Saved normalisation settings for "${model.name}"`, 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save normalisation', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Import Normalisation — ${model.name}`} isOpen={true} onClose={onClose} width="460px">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
        <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--text-main)', fontWeight: 500 }}>
            <Ruler size={13} />
            Raw Model Bounds
          </div>
          {rawDims ? (
            <span>
              {rawDims[0].toFixed(3)} × {rawDims[1].toFixed(3)} × {rawDims[2].toFixed(3)} (W × H × D)
            </span>
          ) : (
            <span>Not measured yet — click Re-normalise to compute bounding box.</span>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enable normalisation for newly added instances</span>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'end' }}>
          <label style={{ color: 'var(--text-muted)' }}>
            Target Largest Dimension
            <input
              type="number"
              step="0.1"
              min="0.01"
              value={targetSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0.01;
                setTargetSize(val);
                if (rawDims) {
                  const maxDim = Math.max(rawDims[0], rawDims[1], rawDims[2]);
                  if (maxDim > 1e-6) {
                    setScaleFactor(Math.round((val / maxDim) * 1_000_000) / 1_000_000);
                  }
                }
              }}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={handleRecompute}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
            }}
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
            Re-normalise
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', color: 'var(--text-muted)' }}>
          <label>
            Scale Factor
            <input
              type="number"
              step="0.001"
              min="0.00001"
              value={scaleFactor}
              onChange={(e) => setScaleFactor(parseFloat(e.target.value) || 1)}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </label>
          <label>
            Pivot X
            <input
              type="number"
              step="0.01"
              value={pivotX}
              onChange={(e) => setPivotX(parseFloat(e.target.value) || 0)}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </label>
          <label>
            Pivot Y
            <input
              type="number"
              step="0.01"
              value={pivotY}
              onChange={(e) => setPivotY(parseFloat(e.target.value) || 0)}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </label>
          <label>
            Pivot Z
            <input
              type="number"
              step="0.01"
              value={pivotZ}
              onChange={(e) => setPivotZ(parseFloat(e.target.value) || 0)}
              style={{ ...inputStyle, marginTop: '4px' }}
            />
          </label>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          Changes apply to new instances dragged into scenes. Existing saved scene instances keep their snapshot scale/pivot so saved layouts do not shift.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '6px 12px', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};
