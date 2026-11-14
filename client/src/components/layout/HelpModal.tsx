import React from 'react';
import { Modal } from '../common/Modal';
import { SHORTCUTS } from '../../constants/shortcuts';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal title="Help & Keyboard Shortcuts" isOpen={isOpen} onClose={onClose} width="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {SHORTCUTS.map((category) => (
          <div key={category.category}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--accent)',
                marginBottom: '8px'
              }}
            >
              {category.category}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                rowGap: '6px',
                fontSize: '12px',
                backgroundColor: 'var(--bg-input)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
            >
              {category.items.map((item) => (
                <React.Fragment key={item.key}>
                  <div style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{item.key}</div>
                  <div style={{ color: 'var(--text-muted)' }}>{item.description}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
