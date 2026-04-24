import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.STORAGE_PROVIDER = 'local';
  });

  it('should load default configuration', () => {
    const config = loadConfig();
    expect(config.redis.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
    expect(config.storage.provider).toBe('local');
  });

  it('should override configuration with environment variables', () => {
    process.env.REDIS_HOST = 'redis-prod';
    process.env.REDIS_PORT = '6380';
    process.env.STORAGE_PROVIDER = 's3';

    const config = loadConfig();
    expect(config.redis.host).toBe('redis-prod');
    expect(config.redis.port).toBe(6380);
    expect(config.storage.provider).toBe('s3');
  });
});
