export interface ShortcutCategory {
  category: string;
  items: {
    key: string;
    description: string;
  }[];
}

export const SHORTCUTS: ShortcutCategory[] = [
  {
    category: 'Camera',
    items: [
      { key: 'F', description: 'Focus selected object' },
      { key: 'Home', description: 'Reset camera view' }
    ]
  },
  {
    category: 'Selection',
    items: [
      { key: 'Click', description: 'Select object' },
      { key: 'Shift + Click', description: 'Multi-select objects' },
      { key: 'Esc', description: 'Deselect all' },
      { key: 'Delete / Backspace', description: 'Remove selected object' }
    ]
  },
  {
    category: 'Transform',
    items: [
      { key: 'W', description: 'Translate (move) mode' },
      { key: 'E', description: 'Rotate mode' },
      { key: 'R', description: 'Scale mode' }
    ]
  },
  {
    category: 'Arrow Keys (Selected Object)',
    items: [
      { key: 'Left / Right', description: 'Move X axis' },
      { key: 'Up / Down', description: 'Move Z axis (away / toward viewer)' },
      { key: 'PageUp / PageDown', description: 'Move Y axis (vertical)' },
      { key: 'Shift + Arrow', description: 'Larger movement step' },
      { key: 'Alt + Arrow', description: 'Finer movement step' }
    ]
  },
  {
    category: 'Scene',
    items: [
      { key: 'G', description: 'Toggle grid' },
      { key: 'Ctrl + D', description: 'Duplicate selected' },
      { key: 'Ctrl + Z', description: 'Undo' },
      { key: 'Ctrl + Shift + Z', description: 'Redo' },
      { key: 'Ctrl + S', description: 'Save scene' },
      { key: 'Ctrl + G', description: 'Group selected' },
      { key: 'Ctrl + Shift + G', description: 'Ungroup selected' }
    ]
  },
  {
    category: 'General',
    items: [
      { key: '?', description: 'Open help and keyboard shortcuts' }
    ]
  }
];
