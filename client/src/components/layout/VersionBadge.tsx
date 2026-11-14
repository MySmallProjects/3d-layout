import React from 'react';
import { getVersionInfo } from '../../utils/version';

interface VersionBadgeProps {
  onOpenAbout: () => void;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ onOpenAbout }) => {
  const { versionDisplay } = getVersionInfo();

  return (
    <div
      onClick={onOpenAbout}
      style={{
        position: 'fixed',
        bottom: '8px',
        left: '12px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        backgroundColor: 'rgba(24, 26, 32, 0.85)',
        padding: '3px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        zIndex: 100,
        fontFamily: 'monospace'
      }}
      title="Click to view About & System info"
    >
      {versionDisplay}
    </div>
  );
};
