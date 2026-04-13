export interface DownloadJobPayload {
  sourceId: string;
  workspaceId: string;
  url: string;
  quality: 'highest' | '1080p' | '720p';
}

export interface TranscribeJobPayload {
  sourceId: string;
  workspaceId: string;
  storagePath: string;
  language: string;
}

export interface AnalyzeJobPayload {
  sourceId: string;
  workspaceId: string;
  transcriptId: string;
}

export interface RenderJobPayload {
  chunkId: string;
  workspaceId: string;
  renderProfileId: string;
  outputFormat: 'mp4';
  resolution: {
    width: number;
    height: number;
  };
}

export interface GuardianConfig {
  enableMetadataSpoofing: boolean;
  enableBitstreamJitter: boolean;
  enableVisualRandomization: boolean;
  enableAudioShift: boolean;
  qualityPreset: 'conservative' | 'balanced' | 'aggressive';
}

export interface VariationJobPayload {
  assetId: string;
  workspaceId: string;
  variationCount: number;
  guardianConfig?: GuardianConfig;
}

export interface PublishJobPayload {
  distributionId: string;
  variationId: string;
  accountId: string;
  workspaceId: string;
  caption: string;
  pinnedComment?: string;
  scheduledAt: string;
}

export interface CheckHealthJobPayload {
  workspaceId?: string;
  accountId?: string;
}
