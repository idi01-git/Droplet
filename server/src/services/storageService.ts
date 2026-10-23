import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DROPLET_LIMITS } from '../../../shared/limits';

export interface StorageDriver {
  saveFile(key: string, buffer: Buffer): Promise<void>;
  getFileStream(key: string): Promise<Readable> | Readable;
  getFileBuffer(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean> | boolean;
  getFileSizeBytes(key: string): Promise<number> | number;
  getPresignedUploadUrl?(key: string, mimeType?: string, expiresInSeconds?: number): Promise<string | null>;
  getPresignedDownloadUrl?(key: string, filename?: string, expiresInSeconds?: number): Promise<string | null>;
}

/**
 * Local Disk Storage Driver for Droplet
 * Stores encrypted or isolated file payloads under opaque UUID keys in uploads directory.
 */
export class LocalStorageDriver implements StorageDriver {
  private uploadDir: string;

  constructor(customDir?: string) {
    this.uploadDir = customDir || process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public getFilePath(key: string): string {
    const safeKey = path.basename(key);
    return path.join(this.uploadDir, safeKey);
  }

  public async saveFile(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.promises.writeFile(filePath, buffer);
  }

  public getFileStream(key: string): Readable {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with key ${key} not found in local storage.`);
    }
    return fs.createReadStream(filePath);
  }

  public async getFileBuffer(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with key ${key} not found in local storage.`);
    }
    return fs.promises.readFile(filePath);
  }

  public async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  public fileExists(key: string): boolean {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }

  public getFileSizeBytes(key: string): number {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) return 0;
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  public async getPresignedUploadUrl(_key: string, _mimeType?: string, _expiresInSeconds?: number): Promise<string | null> {
    return null;
  }

  public async getPresignedDownloadUrl(_key: string, _filename?: string, _expiresInSeconds?: number): Promise<string | null> {
    return null;
  }
}

/**
 * AWS S3 Storage Driver
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_BUCKET_NAME || process.env.R2_BUCKET_NAME || '';
    const region = process.env.AWS_REGION || 'eu-north-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.AWS_ENDPOINT || process.env.R2_ENDPOINT;

    this.client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      endpoint: endpoint || undefined,
    });
  }

  public async saveFile(key: string, buffer: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
      })
    );
  }

  public async getFileStream(key: string): Promise<Readable> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    return res.Body as Readable;
  }

  public async getFileBuffer(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  public async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err) {
      console.error(`Failed to delete S3 object ${key}:`, err);
    }
  }

  public async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  public async getFileSizeBytes(key: string): Promise<number> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return res.ContentLength || 0;
    } catch {
      return 0;
    }
  }

  public async getPresignedUploadUrl(
    key: string,
    mimeType?: string,
    expiresInSeconds: number = DROPLET_LIMITS.S3_PRESIGNED_UPLOAD_TTL_SECONDS
  ): Promise<string | null> {
    if (!this.bucket) return null;
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType || 'application/octet-stream',
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.error('Failed to generate pre-signed upload URL:', err);
      return null;
    }
  }

  public async getPresignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds: number = DROPLET_LIMITS.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS
  ): Promise<string | null> {
    if (!this.bucket) return null;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: filename
          ? `attachment; filename="${encodeURIComponent(filename)}"`
          : 'attachment',
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      console.error('Failed to generate pre-signed download URL:', err);
      return null;
    }
  }
}

/**
 * Hybrid Tiered Storage Driver:
 * - Small files (<= 5 MiB) are saved directly to local disk (0 S3 cost).
 * - Large files (> 5 MiB) are pushed to AWS S3.
 */
export class HybridStorageDriver implements StorageDriver {
  private localDriver: LocalStorageDriver;
  private s3Driver: S3StorageDriver;
  private thresholdBytes: number;

  constructor(thresholdBytes?: number) {
    this.localDriver = new LocalStorageDriver();
    this.s3Driver = new S3StorageDriver();
    const driverType = process.env.STORAGE_DRIVER?.toLowerCase();
    const defaultThreshold = driverType === 's3' ? 0 : DROPLET_LIMITS.HYBRID_S3_THRESHOLD_BYTES;
    const envThreshold = process.env.S3_THRESHOLD_BYTES !== undefined
      ? parseInt(process.env.S3_THRESHOLD_BYTES, 10)
      : defaultThreshold;
    this.thresholdBytes = thresholdBytes !== undefined ? thresholdBytes : envThreshold;
  }

  private isS3Key(key: string): boolean {
    return key.startsWith('s3_');
  }

  private isLocalKey(key: string): boolean {
    return key.startsWith('loc_');
  }

  public async saveFile(key: string, buffer: Buffer): Promise<void> {
    if (this.isS3Key(key) || (!this.isLocalKey(key) && buffer.length > this.thresholdBytes)) {
      await this.s3Driver.saveFile(key, buffer);
    } else {
      await this.localDriver.saveFile(key, buffer);
    }
  }

  public async getFileStream(key: string): Promise<Readable> {
    if (this.isS3Key(key)) {
      return this.s3Driver.getFileStream(key);
    }
    if (this.isLocalKey(key)) {
      return this.localDriver.getFileStream(key);
    }
    if (this.localDriver.fileExists(key)) {
      return this.localDriver.getFileStream(key);
    }
    return this.s3Driver.getFileStream(key);
  }

  public async getFileBuffer(key: string): Promise<Buffer> {
    if (this.isS3Key(key)) {
      return this.s3Driver.getFileBuffer(key);
    }
    if (this.isLocalKey(key)) {
      return this.localDriver.getFileBuffer(key);
    }
    if (this.localDriver.fileExists(key)) {
      return this.localDriver.getFileBuffer(key);
    }
    return this.s3Driver.getFileBuffer(key);
  }

  public async deleteFile(key: string): Promise<void> {
    if (this.isS3Key(key)) {
      await this.s3Driver.deleteFile(key);
      return;
    }
    if (this.isLocalKey(key)) {
      await this.localDriver.deleteFile(key);
      return;
    }
    // Untagged key: safely attempt cleanup from both
    await this.localDriver.deleteFile(key);
    await this.s3Driver.deleteFile(key);
  }

  public async fileExists(key: string): Promise<boolean> {
    if (this.isS3Key(key)) {
      return this.s3Driver.fileExists(key);
    }
    if (this.isLocalKey(key)) {
      return this.localDriver.fileExists(key);
    }
    if (this.localDriver.fileExists(key)) {
      return true;
    }
    return this.s3Driver.fileExists(key);
  }

  public async getFileSizeBytes(key: string): Promise<number> {
    if (this.isS3Key(key)) {
      return this.s3Driver.getFileSizeBytes(key);
    }
    if (this.isLocalKey(key)) {
      return this.localDriver.getFileSizeBytes(key);
    }
    if (this.localDriver.fileExists(key)) {
      return this.localDriver.getFileSizeBytes(key);
    }
    return this.s3Driver.getFileSizeBytes(key);
  }

  public async getPresignedUploadUrl(
    key: string,
    mimeType?: string,
    expiresInSeconds?: number
  ): Promise<string | null> {
    if (this.isS3Key(key)) {
      return this.s3Driver.getPresignedUploadUrl(key, mimeType, expiresInSeconds);
    }
    return null;
  }

  public async getPresignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds?: number
  ): Promise<string | null> {
    if (this.isS3Key(key)) {
      return this.s3Driver.getPresignedDownloadUrl(key, filename, expiresInSeconds);
    }
    return null;
  }
}

class StorageService {
  private driver: StorageDriver;

  constructor() {
    const driverType = process.env.STORAGE_DRIVER?.toLowerCase();
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_STORAGE_DRIVER) {
      this.driver = new LocalStorageDriver();
    } else if (driverType === 's3' || driverType === 'hybrid') {
      this.driver = new HybridStorageDriver();
    } else {
      this.driver = new LocalStorageDriver();
    }
  }

  public setDriver(driver: StorageDriver): void {
    this.driver = driver;
  }

  /**
   * Generate an opaque object key.
   * If size is provided and storage driver is S3/hybrid, prefix with 'loc_' (<= 5MB) or 's3_' (> 5MB).
   */
  public generateOpaqueKey(sizeBytes?: number): string {
    const id = uuidv4();
    if (process.env.NODE_ENV === 'test' && !process.env.TEST_STORAGE_DRIVER) {
      return `loc_${id}`;
    }
    const driverType = process.env.STORAGE_DRIVER?.toLowerCase();

    if (driverType === 's3') {
      const threshold = process.env.S3_THRESHOLD_BYTES !== undefined
        ? parseInt(process.env.S3_THRESHOLD_BYTES, 10)
        : 0;
      if (typeof sizeBytes === 'number' && sizeBytes <= threshold && threshold > 0) {
        return `loc_${id}`;
      }
      return `s3_${id}`;
    }

    if (driverType === 'hybrid') {
      const threshold = process.env.S3_THRESHOLD_BYTES !== undefined
        ? parseInt(process.env.S3_THRESHOLD_BYTES, 10)
        : DROPLET_LIMITS.HYBRID_S3_THRESHOLD_BYTES;
      if (typeof sizeBytes === 'number' && sizeBytes <= threshold) {
        return `loc_${id}`;
      }
      return `s3_${id}`;
    }

    return `loc_${id}`;
  }

  public async save(key: string, buffer: Buffer): Promise<void> {
    return this.driver.saveFile(key, buffer);
  }

  public getStream(key: string): Readable | Promise<Readable> {
    return this.driver.getFileStream(key);
  }

  public async getBuffer(key: string): Promise<Buffer> {
    return this.driver.getFileBuffer(key);
  }

  public async delete(key: string): Promise<void> {
    return this.driver.deleteFile(key);
  }

  public exists(key: string): boolean | Promise<boolean> {
    return this.driver.fileExists(key);
  }

  public getSize(key: string): number | Promise<number> {
    return this.driver.getFileSizeBytes(key);
  }

  public async getPresignedUploadUrl(
    key: string,
    mimeType?: string,
    expiresInSeconds?: number
  ): Promise<string | null> {
    if (this.driver.getPresignedUploadUrl) {
      return this.driver.getPresignedUploadUrl(key, mimeType, expiresInSeconds);
    }
    return null;
  }

  public async getPresignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds?: number
  ): Promise<string | null> {
    if (this.driver.getPresignedDownloadUrl) {
      return this.driver.getPresignedDownloadUrl(key, filename, expiresInSeconds);
    }
    return null;
  }
}

export const storageService = new StorageService();
