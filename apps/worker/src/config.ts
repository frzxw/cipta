import * as dotenv from 'dotenv';
dotenv.config();

export interface WorkerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  concurrency: {
    ingestor: number;
    factory: number;
    guardian: number;
    fleet: number;
  };
  storage: {
    provider: 's3' | 'gcs' | 'local';
    bucket: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    localPath?: string;
  };
  ffmpeg: {
    path: string;
    hwAccel: 'auto' | 'nvenc' | 'videotoolbox' | 'none';
  };
  tempDir: string;
}

export function loadConfig(): WorkerConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: {
      ingestor: parseInt(process.env.WORKER_CONCURRENCY_INGEST ?? '3', 10),
      factory: parseInt(process.env.WORKER_CONCURRENCY_FACTORY ?? '2', 10),
      guardian: parseInt(process.env.WORKER_CONCURRENCY_GUARDIAN ?? '5', 10),
      fleet: parseInt(process.env.WORKER_CONCURRENCY_FLEET ?? '3', 10),
    },
    storage: {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'gcs' | 'local' | undefined) ?? 'local',
      bucket: process.env.STORAGE_BUCKET ?? 'cipta-dev',
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      localPath: process.env.STORAGE_LOCAL_PATH ?? './storage',
    },
    ffmpeg: {
      path: process.env.FFMPEG_PATH ?? 'ffmpeg',
      hwAccel:
        (process.env.FFMPEG_HW_ACCEL as 'auto' | 'nvenc' | 'videotoolbox' | 'none' | undefined) ??
        'auto',
    },
    tempDir: process.env.WORKER_TEMP_DIR ?? '/tmp/cipta',
  };
}
