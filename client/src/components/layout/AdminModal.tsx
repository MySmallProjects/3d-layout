import React from 'react';
import { Modal } from '../common/Modal';
import { Shield } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal title="Admin Settings (Placeholder)" isOpen={isOpen} onClose={onClose} width="440px">
      <div style={{ textAlign: 'center', padding: '24px 8px' }}>
        <Shield size={40} color="var(--accent)" style={{ marginBottom: '12px' }} />
        <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>Admin Dashboard</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>
          Database statistics, backup export/restore, and reset utilities will be implemented in Phase 5.
        </p>
      </div>
    </Modal>
  );
};
