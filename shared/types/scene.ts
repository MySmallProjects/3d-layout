export interface SceneObject {
  id: string;
  modelId: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  parentId: string | null;
}

export interface BackgroundConfig {
  type: 'color' | 'image' | 'none';
  color?: string;
  imagePath?: string;
  equirectangular?: boolean;
}

export interface SceneData {
  schemaVersion: number;
  objects: SceneObject[];
  gridVisible: boolean;
  background: BackgroundConfig;
}
