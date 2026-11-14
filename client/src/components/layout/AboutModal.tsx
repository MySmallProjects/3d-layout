import React from 'react';
import { Modal } from '../common/Modal';
import { HelpCircle, Shield, Box } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
  versionDisplay: string;
  buildDate: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenHelp,
  onOpenAdmin,
  versionDisplay,
  buildDate
}) => {
  return (
    <Modal title="About 3D Scene Composer" isOpen={isOpen} onClose={onClose} width="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}
        >
          <Box size={32} />
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
            3D Scene Composer
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Self-hosted 3D composition and rendering studio
          </p>
        </div>

        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '6px',
            padding: '12px',
            border: '1px solid var(--border-color)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Build:</span>
            <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{versionDisplay}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Build Date:</span>
            <span style={{ fontFamily: 'monospace' }}>{buildDate}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
          <button
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <HelpCircle size={15} />
            Help
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <Shield size={15} />
            Admin
          </button>
        </div>
      </div>
    </Modal>
  );
};
