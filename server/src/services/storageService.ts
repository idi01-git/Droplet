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

export interface StorageDriver {
  saveFile(key: string, buffer: Buffer): Promise<void>;
  getFileStream(key: string): Promise<Readable> | Readable;
  getFileBuffer(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean> | boolean;
  getFileSizeBytes(key: string): Promise<number> | number;
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
      throw new Error(`File with key ${key} not found in storage.`);
    }
    return fs.createReadStream(filePath);
  }

  public async getFileBuffer(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with key ${key} not found in storage.`);
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
}

/**
 * AWS S3 & S3-Compatible (Cloudflare R2, MinIO, Backblaze) Storage Driver
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
}

class StorageService {
  private driver: StorageDriver;

  constructor() {
    const driverType = process.env.STORAGE_DRIVER?.toLowerCase();
    if (driverType === 's3' || driverType === 'r2') {
      this.driver = new S3StorageDriver();
    } else {
      this.driver = new LocalStorageDriver();
    }
  }

  public setDriver(driver: StorageDriver): void {
    this.driver = driver;
  }

  public generateOpaqueKey(): string {
    return uuidv4();
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
}

export const storageService = new StorageService();
