export interface BackgroundItem {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface BackgroundsListResponse {
  backgrounds: BackgroundItem[];
}
