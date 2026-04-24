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

function getEnv(key: string, fallback: string): string {
  const val = process.env[key];
  return typeof val === 'string' && val !== '' ? val : fallback;
}

function getOptionalEnv(key: string): string | undefined {
  const val = process.env[key];
  return typeof val === 'string' && val !== '' ? val : undefined;
}

export function loadConfig(): WorkerConfig {
  return {
    redis: {
      host: getEnv('REDIS_HOST', 'localhost'),
      port: parseInt(getEnv('REDIS_PORT', '6379'), 10),
      password: getOptionalEnv('REDIS_PASSWORD'),
    },
    concurrency: {
      ingestor: parseInt(getEnv('WORKER_CONCURRENCY_INGEST', '3'), 10),
      factory: parseInt(getEnv('WORKER_CONCURRENCY_FACTORY', '2'), 10),
      guardian: parseInt(getEnv('WORKER_CONCURRENCY_GUARDIAN', '5'), 10),
      fleet: parseInt(getEnv('WORKER_CONCURRENCY_FLEET', '3'), 10),
    },
    storage: {
      provider: getEnv('STORAGE_PROVIDER', 'local') as 's3' | 'gcs' | 'local',
      bucket: getEnv('STORAGE_BUCKET', 'cipta-dev'),
      region: getOptionalEnv('AWS_REGION'),
      accessKeyId: getOptionalEnv('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getOptionalEnv('AWS_SECRET_ACCESS_KEY'),
      localPath: getEnv('STORAGE_LOCAL_PATH', './storage'),
    },
    ffmpeg: {
      path: getEnv('FFMPEG_PATH', 'ffmpeg'),
      hwAccel: getEnv('FFMPEG_HW_ACCEL', 'auto') as 'auto' | 'nvenc' | 'videotoolbox' | 'none',
    },
    tempDir: getEnv('WORKER_TEMP_DIR', '/tmp/cipta'),
  };
}
