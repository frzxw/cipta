import dotenv from 'dotenv';

dotenv.config();

export function getWorkerConfig() {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    tempDir: process.env.WORKER_TEMP_DIR || '/tmp/cipta',
    storageProvider: (process.env.STORAGE_PROVIDER as any) || 'local',
  };
}
