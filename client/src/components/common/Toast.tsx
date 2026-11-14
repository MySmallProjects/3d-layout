import React, { useEffect } from 'react';
import { useLibraryStore } from '../../store/libraryStore';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useLibraryStore();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const bg =
    toast.type === 'error'
      ? 'var(--danger)'
      : toast.type === 'success'
      ? 'var(--success)'
      : 'var(--accent)';

  const Icon =
    toast.type === 'error'
      ? AlertTriangle
      : toast.type === 'success'
      ? CheckCircle
      : Info;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '36px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bg,
        color: '#ffffff',
        padding: '10px 16px',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 500,
        zIndex: 10000,
        maxWidth: '450px'
      }}
    >
      <Icon size={16} />
      <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
      <button
        onClick={clearToast}
        style={{
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.8
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
