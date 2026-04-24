import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('REDIS_HOST', 'localhost');
    vi.stubEnv('REDIS_PORT', '6379');
    vi.stubEnv('STORAGE_PROVIDER', 'local');
  });

  it('should load default configuration', () => {
    const config = loadConfig();
    expect(config.redis.host).toBe('localhost');
    expect(config.redis.port).toBe(6379);
    expect(config.storage.provider).toBe('local');
  });

  it('should override configuration with environment variables', () => {
    vi.stubEnv('REDIS_HOST', 'redis-prod');
    vi.stubEnv('REDIS_PORT', '6380');
    vi.stubEnv('STORAGE_PROVIDER', 's3');

    const config = loadConfig();
    expect(config.redis.host).toBe('redis-prod');
    expect(config.redis.port).toBe(6380);
    expect(config.storage.provider).toBe('s3');
  });
});
