export interface AppliedNormalisation {
  scaleFactor: number;
  pivotOffset: [number, number, number];
}

export interface MaterialOverride {
  enabled: boolean;
  color?: string;
  roughness?: number;
  metalness?: number;
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
  isGroup?: boolean;
  /** Snapshot of model normalisation applied when this instance was added; omitted for legacy scenes. */
  appliedNormalisation?: AppliedNormalisation | null;
  /** Optional per-object material overrides (colour, roughness, metalness). */
  materialOverride?: MaterialOverride | null;
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

export interface CameraBookmark {
  id: string;
  name: string;
  camera: CameraState;
  createdAt: string;
}

export type GroundPlaneType = 'none' | 'shadow-catcher' | 'color' | 'image';

export interface GroundPlaneConfig {
  type: GroundPlaneType;
  visible: boolean;
  size: number;
  color?: string;
  imagePath?: string;
  textureRepeat?: number;
}

export interface SceneData {
  schemaVersion: number;
  objects: SceneObject[];
  gridVisible: boolean;
  background: BackgroundConfig;
  camera: CameraState;
  lighting: Record<string, unknown>;
  renderSettings: Record<string, unknown>;
  groundPlane?: GroundPlaneConfig;
  cameraBookmarks?: CameraBookmark[];
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
