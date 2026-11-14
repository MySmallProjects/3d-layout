export interface NormalizationSettings {
  enabledByDefault: boolean;
  defaultTargetSize: number;
}

export interface OptimisationSettings {
  enabledOnUpload: boolean;
  maxTextureSize: number;
  webpQuality: number;
}

export interface AppSettings {
  normalization: NormalizationSettings;
  optimisation: OptimisationSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  normalization: {
    enabledByDefault: true,
    defaultTargetSize: 2.0,
  },
  optimisation: {
    enabledOnUpload: false,
    maxTextureSize: 2048,
    webpQuality: 82,
  },
};
