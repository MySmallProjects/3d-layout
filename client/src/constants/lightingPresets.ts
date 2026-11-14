import type { LightingConfig } from '@shared/types/lighting';
import type { RenderSettings } from '@shared/types/render';

export const BUILTIN_LIGHTING_PRESETS: LightingConfig[] = [
  {
    presetId: 'studio-three-point',
    presetName: 'Studio Three-Point',
    ambientIntensity: 0.45,
    ambientColor: '#ffffff',
    keyLight: { intensity: 2.2, color: '#fff7ed', azimuthDeg: 40, elevationDeg: 45, castShadow: true },
    fillLight: { intensity: 0.9, color: '#dbeafe', azimuthDeg: -55, elevationDeg: 25 },
    rimLight: { intensity: 1.3, color: '#ffffff', azimuthDeg: 155, elevationDeg: 35 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'soft-box',
    presetName: 'Soft Box',
    ambientIntensity: 0.9,
    ambientColor: '#f8fafc',
    keyLight: { intensity: 1.4, color: '#ffffff', azimuthDeg: 20, elevationDeg: 65, castShadow: true },
    fillLight: { intensity: 1.0, color: '#f1f5f9', azimuthDeg: -45, elevationDeg: 40 },
    rimLight: { intensity: 0.6, color: '#ffffff', azimuthDeg: 180, elevationDeg: 50 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'outdoor-daylight',
    presetName: 'Outdoor Daylight',
    ambientIntensity: 0.65,
    ambientColor: '#bae6fd',
    keyLight: { intensity: 2.8, color: '#fffbeb', azimuthDeg: 50, elevationDeg: 60, castShadow: true },
    fillLight: { intensity: 0.7, color: '#93c5fd', azimuthDeg: -110, elevationDeg: 30 },
    rimLight: { intensity: 0.4, color: '#e0f2fe', azimuthDeg: 210, elevationDeg: 20 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'golden-hour',
    presetName: 'Golden Hour',
    ambientIntensity: 0.4,
    ambientColor: '#fed7aa',
    keyLight: { intensity: 2.6, color: '#fb923c', azimuthDeg: 75, elevationDeg: 16, castShadow: true },
    fillLight: { intensity: 0.65, color: '#818cf8', azimuthDeg: -95, elevationDeg: 35 },
    rimLight: { intensity: 1.2, color: '#fde68a', azimuthDeg: 165, elevationDeg: 22 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'overcast',
    presetName: 'Overcast',
    ambientIntensity: 1.15,
    ambientColor: '#cbd5e1',
    keyLight: { intensity: 0.95, color: '#e2e8f0', azimuthDeg: 15, elevationDeg: 75, castShadow: true },
    fillLight: { intensity: 0.85, color: '#cbd5e1', azimuthDeg: -90, elevationDeg: 55 },
    rimLight: { intensity: 0.5, color: '#f1f5f9', azimuthDeg: 170, elevationDeg: 60 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'night-moody',
    presetName: 'Night / Moody',
    ambientIntensity: 0.15,
    ambientColor: '#1e293b',
    keyLight: { intensity: 1.9, color: '#93c5fd', azimuthDeg: 35, elevationDeg: 40, castShadow: true },
    fillLight: { intensity: 0.35, color: '#3b82f6', azimuthDeg: -70, elevationDeg: 20 },
    rimLight: { intensity: 1.5, color: '#f59e0b', azimuthDeg: 150, elevationDeg: 30 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 0.6,
  },
  {
    presetId: 'product-turntable',
    presetName: 'Product Turntable (White Cove)',
    ambientIntensity: 0.95,
    ambientColor: '#ffffff',
    keyLight: { intensity: 1.8, color: '#ffffff', azimuthDeg: 30, elevationDeg: 55, castShadow: true },
    fillLight: { intensity: 1.1, color: '#ffffff', azimuthDeg: -50, elevationDeg: 35 },
    rimLight: { intensity: 1.0, color: '#ffffff', azimuthDeg: 175, elevationDeg: 45 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 1.0,
  },
  {
    presetId: 'flat-unlit',
    presetName: 'Flat / Unlit',
    ambientIntensity: 2.4,
    ambientColor: '#ffffff',
    keyLight: { intensity: 0.0, color: '#ffffff', azimuthDeg: 45, elevationDeg: 45, castShadow: false },
    fillLight: { intensity: 0.0, color: '#ffffff', azimuthDeg: -45, elevationDeg: 45 },
    rimLight: { intensity: 0.0, color: '#ffffff', azimuthDeg: 180, elevationDeg: 45 },
    hdriId: null,
    hdriAsBackground: false,
    hdriIntensity: 0.0,
  },
];

export const DEFAULT_LIGHTING_CONFIG: LightingConfig = BUILTIN_LIGHTING_PRESETS[0];

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  rendererType: 'standard',
  pathTracerSamples: 32,
  pathTracerBounces: 5,
  resolutionPreset: '1080p',
  width: 1920,
  height: 1080,
  samples: 2,
  fov: 45,
  dofEnabled: false,
  dofAperture: 0.002,
  dofFocusDistance: 8,
  transparentBg: false,
  exposure: 1.0,
  toneMapping: 'ACESFilmic',
  ssaoEnabled: true,
  groundPlaneEnabled: true,
  groundShadowOnly: true,
  groundColor: '#22252e',
  lighting: DEFAULT_LIGHTING_CONFIG,
};

export function sphericalToCartesian(
  azimuthDeg: number,
  elevationDeg: number,
  radius = 18
): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const x = radius * Math.cos(el) * Math.sin(az);
  const y = radius * Math.sin(el);
  const z = radius * Math.cos(el) * Math.cos(az);
  return [x, y, z];
}
