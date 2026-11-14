import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { Modal } from '../common/Modal';
import { getBackupDownloadUrl } from '../../api/admin';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setResetting(false);
    }
  }, [isOpen]);

  const canConfirm = confirmText === 'RESET' && !resetting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    setResetting(true);
    try {
      await onConfirmReset();
    } finally {
      setResetting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Everything" width="460px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Warning: This action is irreversible.</strong>
            <p style={{ margin: '6px 0 0 0' }}>
              All user data will be permanently deleted: library models, folders, thumbnails, saved
              scenes, drafts, backgrounds, HDRIs, renders, lighting presets, and settings. The app
              will return to a fresh-install state.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <span>Consider downloading a full backup first.</span>
          <a
            href={getBackupDownloadUrl()}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#60a5fa',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <Download size={13} />
            Download Backup
          </a>
        </div>

        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Type <strong style={{ color: 'var(--text-main)' }}>RESET</strong> to confirm:
          <input
            autoFocus
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            style={{
              width: '100%',
              marginTop: '6px',
              padding: '8px 10px',
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
            disabled={resetting}
            style={{
              padding: '7px 14px',
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
            disabled={!canConfirm}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: canConfirm ? 'var(--danger)' : 'rgba(239, 68, 68, 0.25)',
              color: canConfirm ? '#fff' : 'rgba(255,255,255,0.45)',
              borderRadius: '4px',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            {resetting ? 'Resetting...' : 'Delete All Data'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
