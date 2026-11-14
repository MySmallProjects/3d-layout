import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { SceneDraft } from '@shared/types/scene';
import { Modal } from '../common/Modal';

interface DraftRecoveryModalProps {
  draft: SceneDraft | null;
  onRecover: () => void;
  onDiscard: () => void;
}

export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  draft,
  onRecover,
  onDiscard,
}) => {
  if (!draft) return null;

  return (
    <Modal isOpen={true} onClose={onDiscard} title="Recover Unsaved Draft?" width="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
        <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.5 }}>
          An autosaved draft for <strong>{draft.sceneName}</strong> was found from{' '}
          <strong>{new Date(draft.updatedAt).toLocaleString()}</strong>.
        </p>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
          It contains {draft.data.objects.length} object(s). Would you like to recover it?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={onDiscard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
            }}
          >
            <Trash2 size={13} />
            Discard Draft
          </button>
          <button
            onClick={onRecover}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              fontSize: '12px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '4px',
            }}
          >
            <RotateCcw size={13} />
            Recover Draft
          </button>
        </div>
      </div>
    </Modal>
  );
};
