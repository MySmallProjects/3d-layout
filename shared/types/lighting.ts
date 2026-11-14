export interface DirectionalLightConfig {
  intensity: number;
  color: string;
  azimuthDeg: number;
  elevationDeg: number;
  castShadow?: boolean;
}

export interface LightingConfig {
  presetId: string;
  presetName: string;
  ambientIntensity: number;
  ambientColor: string;
  keyLight: DirectionalLightConfig;
  fillLight: DirectionalLightConfig;
  rimLight: DirectionalLightConfig;
  hdriId: string | null;
  hdriAsBackground: boolean;
  hdriIntensity: number;
}

export interface LightingPresetRecord {
  id: string;
  name: string;
  config: LightingConfig;
  createdAt: string;
}

export interface HdriRecord {
  id: string;
  name: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}
