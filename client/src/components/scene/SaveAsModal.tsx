import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../common/Modal';

interface SaveAsModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

export const SaveAsModal: React.FC<SaveAsModalProps> = ({
  isOpen,
  initialName,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName || 'Untitled Scene');
      setSaving(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Scene As" width="380px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Scene Name
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              marginTop: '6px',
              padding: '7px 10px',
              fontSize: '13px',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '4px',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
