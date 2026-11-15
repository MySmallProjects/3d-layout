import React, { useMemo, useState } from 'react';
import { Clock, ChevronDown, ChevronRight, Tag, Box } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore';

export const LibraryExtrasSection: React.FC = () => {
  const { models, selectedTag, setSelectedTag } = useLibraryStore();
  const [recentOpen, setRecentOpen] = useState(true);

  const recentModels = useMemo(() => {
    return models
      .filter((m) => Boolean(m.lastUsedAt))
      .sort((a, b) => (b.lastUsedAt || '').localeCompare(a.lastUsedAt || ''))
      .slice(0, 6);
  }, [models]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const m of models) {
      for (const t of m.tags ?? []) {
        if (t) tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [models]);

  if (recentModels.length === 0 && allTags.length === 0) {
    return null;
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div
          style={{
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflowX: 'auto',
            borderBottom: recentModels.length > 0 ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <Tag size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <button
            onClick={() => setSelectedTag(null)}
            style={{
              padding: '2px 7px',
              fontSize: '10px',
              borderRadius: '10px',
              whiteSpace: 'nowrap',
              backgroundColor: selectedTag === null ? 'var(--accent)' : 'var(--bg-card)',
              color: selectedTag === null ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            All
          </button>
          {allTags.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(active ? null : tag)}
                style={{
                  padding: '2px 7px',
                  fontSize: '10px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                }}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible Recently Used Section */}
      {recentModels.length > 0 && (
        <div>
          <button
            onClick={() => setRecentOpen((o) => !o)}
            style={{
              width: '100%',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255,255,255,0.015)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={11} />
              RECENTLY USED ({recentModels.length})
            </span>
            {recentOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {recentOpen && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                padding: '6px 10px 8px',
              }}
            >
              {recentModels.map((m) => (
                <div
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/3d-model-id', m.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                  }}
                  title={`Drag "${m.name}" into scene`}
                  style={{
                    width: '64px',
                    flexShrink: 0,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    cursor: 'grab',
                  }}
                >
                  <div
                    style={{
                      height: '44px',
                      backgroundColor: '#16181d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {m.thumbnailPath ? (
                      <img
                        src={`/api/models/${m.id}/thumbnail?t=${encodeURIComponent(m.createdAt)}`}
                        alt={m.name}
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Box size={16} color="var(--text-muted)" />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      padding: '2px 4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'var(--text-main)',
                    }}
                  >
                    {m.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
