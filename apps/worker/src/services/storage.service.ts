import type { WorkerConfig } from '../config';

export interface StorageClient {
  upload(localPath: string, remotePath: string): Promise<string>; // returns URL or Path
  download(remotePath: string, localPath: string): Promise<void>;
  delete(remotePath: string): Promise<void>;
  getSignedUrl(remotePath: string, expirySeconds: number): Promise<string>;
}

export class LocalStorageClient implements StorageClient {
  public constructor(private readonly config: WorkerConfig['storage']) {}

  public async upload(_localPath: string, remotePath: string): Promise<string> {
    // In production this would copy to a storage bucket
    // For local, we might just return the path or simulated URL
    return await Promise.resolve(`local://${remotePath}`);
  }

  public async download(_remotePath: string, _localPath: string): Promise<void> {
    // No-op for local if they share the same disk
    await Promise.resolve();
  }

  public async delete(_remotePath: string): Promise<void> {
    // Delete file
    await Promise.resolve();
  }

  public async getSignedUrl(remotePath: string, _expirySeconds: number): Promise<string> {
    return await Promise.resolve(`file://${remotePath}`);
  }
}

export function createStorageClient(config: WorkerConfig['storage']): StorageClient {
  switch (config.provider) {
    case 'local':
      return new LocalStorageClient(config);
    case 's3':
      throw new Error('S3 storage client not implemented yet');
    case 'gcs':
      throw new Error('GCS storage client not implemented yet');
    default:
      throw new Error(`Unknown storage provider: ${String(config.provider)}`);
  }
}
