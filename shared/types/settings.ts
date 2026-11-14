export interface NormalizationSettings {
  enabledByDefault: boolean;
  defaultTargetSize: number;
}

export interface AppSettings {
  normalization: NormalizationSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  normalization: {
    enabledByDefault: true,
    defaultTargetSize: 2.0,
  },
};
