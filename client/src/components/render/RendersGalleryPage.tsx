import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Edit2,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { RenderRecord } from '@shared/types/render';
import type { SceneListItem } from '@shared/types/scene';
import { Modal } from '../common/Modal';
import { deleteRenderApi, fetchRenders, renameRenderApi } from '../../api/renders';
import { fetchScenes } from '../../api/scenes';

interface RendersGalleryPageProps {
  onBackToEditor: () => void;
  onOpenSceneFromRender: (render: RenderRecord, reRender: boolean) => Promise<void>;
}

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  padding: '5px 8px',
  fontSize: '12px',
  outline: 'none',
};

export const RendersGalleryPage: React.FC<RendersGalleryPageProps> = ({
  onBackToEditor,
  onOpenSceneFromRender,
}) => {
  const [renders, setRenders] = useState<RenderRecord[]>([]);
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [filterSceneId, setFilterSceneId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RenderRecord | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, sceneList] = await Promise.all([
        fetchRenders(sort, filterSceneId || undefined),
        fetchScenes().catch(() => []),
      ]);
      setRenders(list);
      setScenes(sceneList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, filterSceneId]);

  const sceneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of scenes) map.set(s.id, s.name);
    for (const r of renders) {
      if (r.sceneId && !map.has(r.sceneId)) map.set(r.sceneId, r.sceneName);
    }
    return Array.from(map.entries());
  }, [scenes, renders]);

  const handleRenameSubmit = async () => {
    if (!selected) return;
    const trimmed = renameVal.trim();
    if (!trimmed) {
      setRenaming(false);
      return;
    }
    const updated = await renameRenderApi(selected.id, trimmed);
    setSelected(updated);
    setRenders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setRenaming(false);
  };

  const handleDelete = async (render: RenderRecord) => {
    if (!window.confirm(`Delete render "${render.name}"?`)) return;
    await deleteRenderApi(render.id);
    setRenders((prev) => prev.filter((r) => r.id !== render.id));
    if (selected?.id === render.id) setSelected(null);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', overflowY: 'auto' }}>
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
          <ImageIcon size={18} color="var(--accent)" />
          <span>Render Gallery</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={filterSceneId} onChange={(e) => setFilterSceneId(e.target.value)} style={selectStyle}>
            <option value="">All Scenes</option>
            {sceneOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value as 'asc' | 'desc')} style={selectStyle}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>

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
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px 48px' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading renders...</div>
        ) : renders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No renders found. Open the editor and click <strong>Render</strong> in the top toolbar!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {renders.map((r) => (
              <div
                key={r.id}
                onClick={() => { setSelected(r); setRenaming(false); }}
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: '165px', backgroundColor: '#0e1015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={`/api/renders/${r.id}/thumbnail`}
                    alt={r.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{r.sceneName}</span>
                    <span>{r.width}×{r.height}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title={selected.name} width="820px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#0b0c10', borderRadius: '6px', overflow: 'hidden', textAlign: 'center' }}>
              <img
                src={`/api/renders/${selected.id}/file`}
                alt={selected.name}
                style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain' }}
              />
            </div>

            {renaming && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  autoFocus
                  value={renameVal}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit();
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                  style={{ ...selectStyle, flex: 1 }}
                />
                <button onClick={handleRenameSubmit} style={{ padding: '5px 12px', backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '4px', fontSize: '12px' }}>
                  Save Name
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <div>Scene: <strong style={{ color: 'var(--text-main)' }}>{selected.sceneName}</strong></div>
              <div>Renderer: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.rendererType === 'pathtraced' ? 'Path traced' : 'Fast (standard)'}</strong></div>
              <div>Resolution: <strong style={{ color: 'var(--text-main)' }}>{selected.width}×{selected.height}</strong></div>
              <div>Samples: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.rendererType === 'pathtraced' ? `${selected.settings.pathTracerSamples ?? 32} spp (${selected.settings.pathTracerBounces ?? 5} bounces)` : `${selected.settings.samples}x`}</strong></div>
              <div>FOV: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.fov}°</strong></div>
              <div>Tone Map: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.toneMapping}</strong></div>
              <div>Exposure: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.exposure}</strong></div>
              <div>Lighting: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.lighting.presetName}</strong></div>
              <div>DOF: <strong style={{ color: 'var(--text-main)' }}>{selected.settings.dofEnabled ? `${selected.settings.dofFocusDistance}m` : 'Off'}</strong></div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onOpenSceneFromRender(selected, false)}
                  disabled={!selected.sceneId}
                  title={selected.sceneId ? 'Open the scene that made this render' : 'Scene was not saved when rendered'}
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
                    opacity: selected.sceneId ? 1 : 0.45,
                  }}
                >
                  <FolderOpen size={13} />
                  Open Scene
                </button>
                <button
                  onClick={() => onOpenSceneFromRender(selected, true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '4px',
                  }}
                >
                  <RefreshCw size={13} />
                  Re-render with Same Settings
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`/api/renders/${selected.id}/file`}
                  download={`${selected.name}.png`}
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
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} />
                  Download
                </a>
                <button
                  onClick={() => { setRenaming(true); setRenameVal(selected.name); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                  }}
                >
                  <Edit2 size={13} />
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: '#f87171',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                  }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
