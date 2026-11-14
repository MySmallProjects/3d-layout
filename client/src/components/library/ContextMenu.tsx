import React, { useEffect } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Ensure menu stays within window boundaries
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 32 - 10);

  return (
    <div
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        backgroundColor: 'var(--bg-panel-header)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '4px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        minWidth: '160px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            color: item.danger ? 'var(--danger)' : 'var(--text-main)',
            borderRadius: '4px',
            textAlign: 'left',
            width: '100%',
            transition: 'background 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = item.danger
              ? 'rgba(239, 68, 68, 0.15)'
              : 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};
