export interface ShortcutItem {
  id: string;
  key: string;
  description: string;
  match?: (e: KeyboardEvent) => boolean;
}

export interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

export const SHORTCUTS: ShortcutCategory[] = [
  {
    category: 'Camera & Mouse',
    items: [
      { id: 'orbit', key: 'Left-drag', description: 'Orbit camera around target' },
      { id: 'pan', key: 'Right-drag', description: 'Pan camera' },
      { id: 'zoom', key: 'Scroll wheel', description: 'Zoom in / out' },
      {
        id: 'focus',
        key: 'F',
        description: 'Focus selected object',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'f' || e.key === 'F')
      },
      {
        id: 'resetView',
        key: 'Home',
        description: 'Reset camera view',
        match: (e) => e.key === 'Home'
      }
    ]
  },
  {
    category: 'Selection',
    items: [
      { id: 'select', key: 'Click', description: 'Select object (click empty to deselect)' },
      { id: 'multiSelect', key: 'Shift + Click', description: 'Multi-select objects' },
      {
        id: 'deselect',
        key: 'Esc',
        description: 'Deselect all',
        match: (e) => e.key === 'Escape'
      },
      {
        id: 'delete',
        key: 'Delete / Backspace',
        description: 'Remove selected object(s)',
        match: (e) => e.key === 'Delete' || e.key === 'Backspace'
      }
    ]
  },
  {
    category: 'Transform',
    items: [
      {
        id: 'modeTranslate',
        key: 'W',
        description: 'Translate (move) mode',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'w' || e.key === 'W')
      },
      {
        id: 'modeRotate',
        key: 'E',
        description: 'Rotate mode',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'e' || e.key === 'E')
      },
      {
        id: 'modeScale',
        key: 'R',
        description: 'Scale mode',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'r' || e.key === 'R')
      },
      {
        id: 'dropToSurface',
        key: 'D',
        description: 'Drop selected onto surface below',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'd' || e.key === 'D')
      }
    ]
  },
  {
    category: 'Arrow Keys (Selected Object)',
    items: [
      { id: 'moveX', key: 'Left / Right', description: 'Move X axis (relative to view)' },
      { id: 'moveZ', key: 'Up / Down', description: 'Move Z axis (away / toward viewer)' },
      { id: 'moveY', key: 'PageUp / PageDown', description: 'Move Y axis (vertical height)' },
      { id: 'stepLarge', key: 'Shift + Arrow', description: 'Larger movement step (4x)' },
      { id: 'stepFine', key: 'Alt + Arrow', description: 'Finer movement step (0.1x)' }
    ]
  },
  {
    category: 'Scene',
    items: [
      {
        id: 'toggleGrid',
        key: 'G',
        description: 'Toggle grid floor',
        match: (e) => !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'g' || e.key === 'G')
      },
      {
        id: 'duplicate',
        key: 'Ctrl + D',
        description: 'Duplicate selected',
        match: (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'd' || e.key === 'D')
      },
      {
        id: 'undo',
        key: 'Ctrl + Z',
        description: 'Undo last edit',
        match: (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')
      },
      {
        id: 'redo',
        key: 'Ctrl + Shift + Z',
        description: 'Redo last undone edit',
        match: (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')
      },
      {
        id: 'save',
        key: 'Ctrl + S',
        description: 'Save scene',
        match: (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S'),
      },
      {
        id: 'group',
        key: 'Ctrl + G',
        description: 'Group selected objects',
        match: (e) => (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'g' || e.key === 'G'),
      },
      {
        id: 'ungroup',
        key: 'Ctrl + Shift + G',
        description: 'Ungroup selected group',
        match: (e) => (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.key === 'g' || e.key === 'G'),
      }
    ]
  },
  {
    category: 'General',
    items: [
      {
        id: 'help',
        key: '?',
        description: 'Open help and keyboard shortcuts',
        match: (e) => e.key === '?' || (e.key === '/' && e.shiftKey)
      }
    ]
  }
];

export function matchShortcutAction(e: KeyboardEvent): string | null {
  for (const cat of SHORTCUTS) {
    for (const item of cat.items) {
      if (item.match && item.match(e)) {
        return item.id;
      }
    }
  }
  return null;
}
