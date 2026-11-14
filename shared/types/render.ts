import type { CameraState } from './scene';
import type { LightingConfig } from './lighting';

export type ResolutionPreset = '1080p' | '4k' | 'square' | 'custom';
export type ToneMappingMode = 'ACESFilmic' | 'AgX' | 'Reinhard' | 'None';
export type RendererType = 'standard' | 'pathtraced';

export interface RenderSettings {
  rendererType?: RendererType;
  pathTracerSamples?: number;
  pathTracerBounces?: number;
  resolutionPreset: ResolutionPreset;
  width: number;
  height: number;
  samples: 1 | 2 | 4 | 8;
  fov: number;
  dofEnabled: boolean;
  dofAperture: number;
  dofFocusDistance: number;
  transparentBg: boolean;
  exposure: number;
  toneMapping: ToneMappingMode;
  ssaoEnabled: boolean;
  groundPlaneEnabled: boolean;
  groundShadowOnly: boolean;
  groundColor: string;
  lighting: LightingConfig;
}

export interface RenderRecord {
  id: string;
  name: string;
  sceneId: string | null;
  sceneName: string;
  filePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  createdAt: string;
  settings: RenderSettings;
  camera: CameraState;
}
