import React, { useEffect, useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { LibraryModel } from '../../types';
import { Modal } from '../common/Modal';
import { useLibraryStore } from '../../store/libraryStore';

interface ModelTagsModalProps {
  model: LibraryModel | null;
  onClose: () => void;
}

export const ModelTagsModal: React.FC<ModelTagsModalProps> = ({ model, onClose }) => {
  const { updateModelTags, showToast } = useLibraryStore();
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (model) {
      setTags(model.tags ?? []);
      setInput('');
    }
  }, [model]);

  if (!model) return null;

  const addCurrentInput = () => {
    const parts = input
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !tags.includes(s));
    if (parts.length > 0) {
      setTags([...tags, ...parts]);
    }
    setInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const pending = input
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !tags.includes(s));
    const finalTags = [...tags, ...pending];
    setSaving(true);
    try {
      await updateModelTags(model.id, finalTags);
      showToast(`Updated tags for "${model.name}"`, 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update tags', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Manage Tags — ${model.name}`} isOpen={!!model} onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Current Tags
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              minHeight: '32px',
              padding: '6px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
            }}
          >
            {tags.length === 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No tags yet</span>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.18)',
                    color: '#93c5fd',
                  }}
                >
                  <Tag size={10} />
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    style={{ display: 'inline-flex', color: '#93c5fd' }}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Add Tags (comma-separated)
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  e.preventDefault();
                  addCurrentInput();
                }
              }}
              placeholder="e.g. furniture, office, chair"
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            />
            <button
              type="button"
              onClick={addCurrentInput}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '6px 14px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {saving ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
