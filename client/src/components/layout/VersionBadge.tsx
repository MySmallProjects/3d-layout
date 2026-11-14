import React, { useState } from 'react';
import { AboutModal } from './AboutModal';

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: number;
declare const __BUILD_DATE__: string;

interface VersionBadgeProps {
  onOpenHelp: () => void;
  onOpenAdmin: () => void;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ onOpenHelp, onOpenAdmin }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const isDev = import.meta.env.DEV;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso;
    }
  };

  const rawBuildDate = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString();
  const buildDateFormatted = formatDate(rawBuildDate);

  const versionDisplay = isDev
    ? `dev · ${formatDate(new Date().toISOString())}`
    : `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}.${typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : 1} · ${buildDateFormatted}`;

  return (
    <>
      <div
        onClick={() => setIsAboutOpen(true)}
        style={{
          position: 'fixed',
          bottom: '8px',
          right: '12px',
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

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onOpenHelp={onOpenHelp}
        onOpenAdmin={onOpenAdmin}
        versionDisplay={versionDisplay}
        buildDate={buildDateFormatted}
      />
    </>
  );
};
