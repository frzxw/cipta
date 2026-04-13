export const INGESTOR_JOB_NAMES = {
  DOWNLOAD: 'download',
  TRANSCRIBE: 'transcribe',
  ANALYZE: 'analyze',
} as const;

export const FACTORY_JOB_NAMES = {
  RENDER: 'render',
} as const;

export const GUARDIAN_JOB_NAMES = {
  GENERATE_VARIATIONS: 'generate-variations',
} as const;

export const FLEET_JOB_NAMES = {
  PUBLISH: 'publish',
  CHECK_HEALTH: 'check-health',
} as const;

export type IngestorJobName = (typeof INGESTOR_JOB_NAMES)[keyof typeof INGESTOR_JOB_NAMES];
export type FactoryJobName = (typeof FACTORY_JOB_NAMES)[keyof typeof FACTORY_JOB_NAMES];
export type GuardianJobName = (typeof GUARDIAN_JOB_NAMES)[keyof typeof GUARDIAN_JOB_NAMES];
export type FleetJobName = (typeof FLEET_JOB_NAMES)[keyof typeof FLEET_JOB_NAMES];

export type JobName = IngestorJobName | FactoryJobName | GuardianJobName | FleetJobName;
