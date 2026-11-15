import React, { useState, useEffect } from 'react';
import { Sliders, Lock, Unlock, ArrowDownToLine, Copy, Trash2 } from 'lucide-react';
import { useSceneStore } from '../../store/sceneStore';
import { NumberInput } from './NumberInput';
import { MaterialOverrideSection } from './MaterialOverrideSection';

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

export const PropertiesPanel: React.FC = () => {
  const {
    objects,
    selectedObjectIds,
    renameObject,
    updateObjectTransform,
    toggleMirror,
    triggerSnapToFloor,
    triggerDropToSurface,
    duplicateSelected,
    deleteObjects,
    beginTransaction,
    commitTransaction
  } = useSceneStore();

  const [uniformScale, setUniformScale] = useState(true);
  const [nameInput, setNameInput] = useState('');

  const selectedObjects = objects.filter((o) => selectedObjectIds.includes(o.id));
  const singleObj = selectedObjects.length === 1 ? selectedObjects[0] : null;

  useEffect(() => {
    if (singleObj) {
      setNameInput(singleObj.name);
    }
  }, [singleObj?.id, singleObj?.name]);

  if (selectedObjects.length === 0) {
    return (
      <div
        style={{
          padding: '20px 14px',
          borderTop: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          fontSize: '12px',
          textAlign: 'center'
        }}
      >
        Select an object to inspect and edit its properties.
      </div>
    );
  }

  if (selectedObjects.length > 1) {
    return (
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
          <Sliders size={14} color="var(--accent)" />
          <span>{selectedObjects.length} OBJECTS SELECTED</span>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Use the viewport gizmo or arrow keys to move, rotate, or scale the selection around its center.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={triggerSnapToFloor}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--text-main)'
            }}
          >
            <ArrowDownToLine size={13} color="var(--accent)" />
            <span>Snap All to Floor</span>
          </button>

          <button
            onClick={duplicateSelected}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--text-main)'
            }}
          >
            <Copy size={13} />
            <span>Duplicate Selected</span>
          </button>

          <button
            onClick={() => deleteObjects(selectedObjectIds)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--danger)'
            }}
          >
            <Trash2 size={13} />
            <span>Delete Selected</span>
          </button>
        </div>
      </div>
    );
  }

  // Single Object View
  const obj = singleObj!;

  const updatePos = (axis: 0 | 1 | 2, val: number, commit = false) => {
    const next: [number, number, number] = [...obj.position];
    next[axis] = val;
    updateObjectTransform(obj.id, { position: next }, commit);
  };

  const updateRotDeg = (axis: 0 | 1 | 2, deg: number, commit = false) => {
    const next: [number, number, number] = [...obj.rotation];
    next[axis] = deg * DEG2RAD;
    updateObjectTransform(obj.id, { rotation: next }, commit);
  };

  const updateScale = (axis: 0 | 1 | 2, val: number, commit = false) => {
    const safeVal = Math.abs(val) < 0.001 ? (val < 0 ? -0.001 : 0.001) : val;
    const next: [number, number, number] = [...obj.scale];

    if (uniformScale) {
      const prevAbs = Math.max(Math.abs(obj.scale[axis]), 0.001);
      const ratio = Math.abs(safeVal) / prevAbs;
      next[0] = (obj.scale[0] < 0 ? -1 : 1) * Math.abs(obj.scale[0]) * ratio;
      next[1] = (obj.scale[1] < 0 ? -1 : 1) * Math.abs(obj.scale[1]) * ratio;
      next[2] = (obj.scale[2] < 0 ? -1 : 1) * Math.abs(obj.scale[2]) * ratio;
      next[axis] = (obj.scale[axis] < 0 ? -1 : 1) * Math.abs(safeVal);
    } else {
      next[axis] = (obj.scale[axis] < 0 ? -1 : 1) * Math.abs(safeVal);
    }

    updateObjectTransform(obj.id, { scale: next }, commit);
  };

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-panel)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 14px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.04em'
        }}
      >
        <Sliders size={14} color="var(--accent)" />
        <span>PROPERTIES</span>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Name
          </label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => renameObject(obj.id, nameInput)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameObject(obj.id, nameInput);
                e.currentTarget.blur();
              }
            }}
            style={{
              width: '100%',
              padding: '5px 8px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
        </div>

        {/* Position */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Position (m)
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <NumberInput
              label="X"
              labelColor="#ef4444"
              value={obj.position[0]}
              step={0.1}
              onChange={(v, commit) => updatePos(0, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Y"
              labelColor="#22c55e"
              value={obj.position[1]}
              step={0.1}
              onChange={(v, commit) => updatePos(1, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Z"
              labelColor="#3b82f6"
              value={obj.position[2]}
              step={0.1}
              onChange={(v, commit) => updatePos(2, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Rotation (°)
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <NumberInput
              label="X"
              labelColor="#ef4444"
              value={obj.rotation[0] * RAD2DEG}
              step={1}
              precision={1}
              onChange={(v, commit) => updateRotDeg(0, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Y"
              labelColor="#22c55e"
              value={obj.rotation[1] * RAD2DEG}
              step={1}
              precision={1}
              onChange={(v, commit) => updateRotDeg(1, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Z"
              labelColor="#3b82f6"
              value={obj.rotation[2] * RAD2DEG}
              step={1}
              precision={1}
              onChange={(v, commit) => updateRotDeg(2, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
          </div>
        </div>

        {/* Scale */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scale</span>
            <button
              onClick={() => setUniformScale(!uniformScale)}
              title={uniformScale ? 'Uniform scale locked' : 'Uniform scale unlocked'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                color: uniformScale ? 'var(--accent)' : 'var(--text-muted)',
                padding: '1px 4px',
                borderRadius: '3px'
              }}
            >
              {uniformScale ? <Lock size={11} /> : <Unlock size={11} />}
              <span>{uniformScale ? 'Uniform' : 'Free'}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <NumberInput
              label="X"
              labelColor="#ef4444"
              value={Math.abs(obj.scale[0])}
              step={0.05}
              onChange={(v, commit) => updateScale(0, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Y"
              labelColor="#22c55e"
              value={Math.abs(obj.scale[1])}
              step={0.05}
              onChange={(v, commit) => updateScale(1, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
            <NumberInput
              label="Z"
              labelColor="#3b82f6"
              value={Math.abs(obj.scale[2])}
              step={0.05}
              onChange={(v, commit) => updateScale(2, v, commit)}
              onScrubStart={beginTransaction}
              onScrubEnd={commitTransaction}
            />
          </div>
        </div>

        {/* Mirror */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Mirror Axis
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['x', 'y', 'z'] as const).map((axis, idx) => {
              const isMirrored = obj.scale[idx] < 0;
              return (
                <label
                  key={axis}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '5px',
                    backgroundColor: isMirrored ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-input)',
                    border: isMirrored ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isMirrored}
                    onChange={() => toggleMirror(obj.id, axis)}
                  />
                  <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{axis}</span>
                </label>
              );
            })}
          </div>
        </div>

        <MaterialOverrideSection object={obj} />

        {/* Drop onto Surface Below & Snap to Floor */}
        <button
          onClick={triggerDropToSurface}
          title="Drop selected onto surface below (D)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--text-main)',
            marginTop: '4px'
          }}
        >
          <ArrowDownToLine size={14} color="var(--accent)" />
          <span>Drop onto Surface Below (D)</span>
        </button>

        <button
          onClick={triggerSnapToFloor}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--text-main)'
          }}
        >
          <ArrowDownToLine size={14} color="var(--text-muted)" />
          <span>Snap to Floor (Y = 0)</span>
        </button>
      </div>
    </div>
  );
};
