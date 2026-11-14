export interface AppliedNormalisation {
  scaleFactor: number;
  pivotOffset: [number, number, number];
}

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
  /** Snapshot of model normalisation applied when this instance was added; omitted for legacy scenes. */
  appliedNormalisation?: AppliedNormalisation | null;
}

export interface BackgroundConfig {
  type: 'color' | 'image' | 'none';
  color?: string;
  imagePath?: string;
  equirectangular?: boolean;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface SceneData {
  schemaVersion: number;
  objects: SceneObject[];
  gridVisible: boolean;
  background: BackgroundConfig;
  camera: CameraState;
  lighting: Record<string, unknown>;
  renderSettings: Record<string, unknown>;
  groundPlane?: Record<string, unknown>;
  cameraBookmarks?: unknown[];
}

export interface SceneRecord {
  id: string;
  name: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
  data: SceneData;
}

export interface SceneListItem {
  id: string;
  name: string;
  thumbnailPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SceneDraft {
  id: string;
  sceneId: string | null;
  sceneName: string;
  data: SceneData;
  updatedAt: string;
}
