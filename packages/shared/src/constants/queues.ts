export const QUEUE_NAMES = {
  INGESTOR: 'cipta:ingestor',
  FACTORY: 'cipta:factory',
  GUARDIAN: 'cipta:guardian',
  FLEET: 'cipta:fleet',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueJobOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: {
    age: number;
    count: number;
  };
  removeOnFail?: {
    age: number;
    count: number;
  };
}

export const DEFAULT_JOB_OPTIONS: Record<QueueName, QueueJobOptions> = {
  [QUEUE_NAMES.INGESTOR]: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
  [QUEUE_NAMES.FACTORY]: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
  [QUEUE_NAMES.GUARDIAN]: {
    attempts: 1,
    removeOnComplete: { age: 86400, count: 500 },
    removeOnFail: { age: 604800, count: 2000 },
  },
  [QUEUE_NAMES.FLEET]: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 300000 },
    removeOnComplete: { age: 172800, count: 5000 },
    removeOnFail: { age: 604800, count: 5000 },
  },
};
