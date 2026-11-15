import React from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { SceneObject } from '../../types';
import { useSceneStore } from '../../store/sceneStore';

interface MaterialOverrideSectionProps {
  object: SceneObject;
}

export const MaterialOverrideSection: React.FC<MaterialOverrideSectionProps> = ({ object }) => {
  const { updateObjectMaterialOverride } = useSceneStore();
  if (object.isGroup) return null;

  const override = object.materialOverride ?? { enabled: false };
  const enabled = Boolean(override.enabled);
  const color = override.color ?? '#d1d5db';
  const roughness = typeof override.roughness === 'number' ? override.roughness : 0.5;
  const metalness = typeof override.metalness === 'number' ? override.metalness : 0.1;

  const updatePatch = (patch: Partial<typeof override>) => {
    updateObjectMaterialOverride(object.id, {
      enabled: true,
      color: override.color,
      roughness: override.roughness,
      metalness: override.metalness,
      ...patch,
    });
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-color)',
        paddingTop: '10px',
        marginTop: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              if (!e.target.checked) {
                updateObjectMaterialOverride(object.id, {
                  ...override,
                  enabled: false,
                });
              } else {
                updateObjectMaterialOverride(object.id, {
                  enabled: true,
                  color: override.color ?? '#d1d5db',
                  roughness: typeof override.roughness === 'number' ? override.roughness : 0.5,
                  metalness: typeof override.metalness === 'number' ? override.metalness : 0.1,
                });
              }
            }}
          />
          <Palette size={12} color="var(--accent)" />
          <span>Material Override</span>
        </label>

        {enabled && (
          <button
            onClick={() => updateObjectMaterialOverride(object.id, null)}
            title="Reset to model's original materials"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              padding: '2px 5px',
              borderRadius: '3px',
            }}
          >
            <RotateCcw size={10} />
            Reset
          </button>
        )}
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
          {/* Colour */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Base Colour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="color"
                value={color}
                onChange={(e) => updatePatch({ color: e.target.value })}
                style={{
                  width: '24px',
                  height: '20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-main)' }}>
                {color.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Roughness */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Roughness</span>
              <span style={{ fontFamily: 'monospace' }}>{roughness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={roughness}
              onChange={(e) => updatePatch({ roughness: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Metalness */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Metalness</span>
              <span style={{ fontFamily: 'monospace' }}>{metalness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={metalness}
              onChange={(e) => updatePatch({ metalness: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
