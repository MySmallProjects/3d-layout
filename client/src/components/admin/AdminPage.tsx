import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  HardDrive,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import type { AdminOverview, RestoreValidationResult } from '@shared/types/admin';
import {
  confirmRestoreApi,
  discardRestoreApi,
  fetchAdminOverview,
  getBackupDownloadUrl,
  resetAllDataApi,
  validateBackupFile,
} from '../../api/admin';
import { ResetConfirmModal } from './ResetConfirmModal';
import { NormalisationAdminSection } from './NormalisationAdminSection';
import { OptimisationAdminSection } from './OptimisationAdminSection';

interface AdminPageProps {
  onBackToEditor: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBackToEditor }) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validation, setValidation] = useState<RestoreValidationResult | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load admin overview',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusMsg(null);
    setValidation(null);
    setUploadProgress(0);

    try {
      const res = await validateBackupFile(file, (pct) => setUploadProgress(pct));
      setValidation(res);
      setUploadProgress(null);
    } catch (err) {
      setUploadProgress(null);
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Backup validation failed',
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!validation) return;
    setRestoring(true);
    setStatusMsg(null);
    try {
      await confirmRestoreApi(validation.token);
      setValidation(null);
      setStatusMsg({ type: 'success', text: 'Backup restored successfully! Reloading...' });
      setTimeout(() => {
        window.location.href = '/';
      }, 900);
    } catch (err) {
      setRestoring(false);
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Restore failed',
      });
    }
  };

  const handleCancelRestore = () => {
    if (validation) {
      discardRestoreApi(validation.token).catch(() => {});
      setValidation(null);
    }
  };

  const handleConfirmReset = async () => {
    await resetAllDataApi('RESET');
    setIsResetOpen(false);
    setStatusMsg({ type: 'success', text: 'All data reset. Reloading fresh install...' });
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '18px 20px',
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: '48px',
          backgroundColor: 'var(--bg-panel-header)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '14px' }}>
          <Shield size={18} color="var(--accent)" />
          <span>Admin & Maintenance</span>
        </div>
        <button
          onClick={onBackToEditor}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '5px',
          }}
        >
          <ArrowLeft size={14} />
          Back to Editor
        </button>
      </header>

      <main style={{ maxWidth: '880px', margin: '24px auto', padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {statusMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                statusMsg.type === 'error'
                  ? 'rgba(239, 68, 68, 0.14)'
                  : statusMsg.type === 'success'
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(59, 130, 246, 0.14)',
              border: `1px solid ${
                statusMsg.type === 'error'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : statusMsg.type === 'success'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : 'rgba(59, 130, 246, 0.4)'
              }`,
              color:
                statusMsg.type === 'error'
                  ? '#fca5a5'
                  : statusMsg.type === 'success'
                  ? '#6ee7b7'
                  : '#93c5fd',
            }}
          >
            {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Overview */}
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HardDrive size={16} color="var(--accent)" />
              System Overview
            </h2>
            <button
              onClick={loadOverview}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          {loading || !overview ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading overview...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                {[
                  ['Models', overview.counts.models],
                  ['Folders', overview.counts.folders],
                  ['Scenes', overview.counts.scenes],
                  ['Backgrounds', overview.counts.backgrounds],
                  ['HDRIs', overview.counts.hdris],
                  ['Renders', overview.counts.renders],
                  ['App Version', `v${overview.appVersion}.${overview.buildNumber}`],
                ].map(([label, val]) => (
                  <div
                    key={String(label)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '3px' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Storage Used: <strong style={{ color: 'var(--text-main)' }}>{formatBytes(overview.storage.total)}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '12px' }}>
                  {[
                    ['Models', overview.storage.models],
                    ['Thumbnails', overview.storage.thumbnails],
                    ['Backgrounds', overview.storage.backgrounds],
                    ['HDRIs', overview.storage.hdris],
                    ['Renders', overview.storage.renders],
                    ['Database', overview.storage.database],
                  ].map(([cat, bytes]) => (
                    <div key={String(cat)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-input)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{cat}</span>
                      <span>{formatBytes(Number(bytes))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Backup */}
        <section style={cardStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Backup</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
            Download a single streamed <code>.zip</code> archive containing a consistent SQLite database
            snapshot, all models, thumbnails, backgrounds, HDRIs, renders, presets, settings, and{' '}
            <code>manifest.json</code>.
          </p>
          <a
            href={getBackupDownloadUrl()}
            download
            onClick={() => setStatusMsg({ type: 'info', text: 'Backup download started...' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: '5px',
              textDecoration: 'none',
            }}
          >
            <Download size={15} />
            Download Backup (.zip)
          </a>
        </section>

        {/* Restore */}
        <section style={cardStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Restore</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
            Upload a previously exported backup <code>.zip</code>. The archive will be validated before any
            live data is modified.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null || restoring}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-main)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
            }}
          >
            <Upload size={15} />
            {uploadProgress !== null ? `Uploading & Validating (${uploadProgress}%)...` : 'Select Backup Zip...'}
          </button>

          {validation && (
            <div
              style={{
                marginTop: '14px',
                padding: '14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-focus)',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>Backup Validated — Ready to Restore</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                <div>App Version: <strong style={{ color: 'var(--text-main)' }}>v{validation.manifest.appVersion}.{validation.manifest.buildNumber}</strong></div>
                <div>Schema Version: <strong style={{ color: 'var(--text-main)' }}>v{validation.manifest.dbSchemaVersion}</strong></div>
                <div>Created: <strong style={{ color: 'var(--text-main)' }}>{new Date(validation.manifest.timestamp).toLocaleString()}</strong></div>
                <div>Files: <strong style={{ color: 'var(--text-main)' }}>{validation.fileCount} ({formatBytes(validation.totalSizeBytes)})</strong></div>
                <div>Models: <strong style={{ color: 'var(--text-main)' }}>{validation.manifest.counts.models}</strong></div>
                <div>Scenes: <strong style={{ color: 'var(--text-main)' }}>{validation.manifest.counts.scenes}</strong></div>
              </div>

              {validation.warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px' }}>
                  {w}
                </div>
              ))}

              <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '12px' }}>
                Warning: Confirming will replace all current models, scenes, backgrounds, and database records.
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleConfirmRestore}
                  disabled={restoring}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '4px',
                  }}
                >
                  {restoring ? 'Restoring...' : 'Confirm & Restore Backup'}
                </button>
                <button
                  onClick={handleCancelRestore}
                  disabled={restoring}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <NormalisationAdminSection cardStyle={cardStyle} onStatus={setStatusMsg} />
        <OptimisationAdminSection
          cardStyle={cardStyle}
          onStatus={setStatusMsg}
          onModelsChanged={loadOverview}
        />

        {/* Danger Zone */}
        <section
          style={{
            ...cardStyle,
            border: '1px solid rgba(239, 68, 68, 0.45)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f87171', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            Danger Zone
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
            Permanently delete all user data and return the application to a clean fresh-install state.
          </p>
          <button
            onClick={() => setIsResetOpen(true)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--danger)',
              color: '#fff',
              borderRadius: '5px',
            }}
          >
            Reset Everything...
          </button>
        </section>
      </main>

      <ResetConfirmModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirmReset={handleConfirmReset}
      />
    </div>
  );
};
