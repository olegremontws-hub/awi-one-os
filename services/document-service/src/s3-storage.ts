import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ObjectStorage } from './storage.js';

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly bucket: string, config?: { endpoint?: string; region?: string }) {
    this.client = new S3Client({
      endpoint: config?.endpoint,
      region: config?.region ?? 'us-east-1',
      forcePathStyle: Boolean(config?.endpoint),
    });
  }
  async put(key: string, bytes: Uint8Array) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes }));
  }
  async get(key: string) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new Error('OBJECT_STORAGE_EMPTY_BODY');
    return response.Body.transformToByteArray();
  }
}

export function objectStorageFromEnv(): ObjectStorage {
  const bucket = process.env.AWI_S3_BUCKET;
  if (!bucket) throw new Error('AWI_S3_BUCKET is required');
  return new S3ObjectStorage(bucket, {
    endpoint: process.env.AWI_S3_ENDPOINT,
    region: process.env.AWI_S3_REGION,
  });
}
