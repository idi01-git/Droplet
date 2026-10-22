import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageDriver {
  saveFile(key: string, buffer: Buffer): Promise<void>;
  getFileStream(key: string): fs.ReadStream;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): boolean;
  getFileSizeBytes(key: string): number;
}

/**
 * Local Disk Storage Driver for Droplet
 * Stores encrypted or isolated file payloads under opaque UUID keys in uploads directory.
 * Spec Section 4.3: Treat client MIME type and filename as untrusted. Never use user filename as storage path.
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
    // Prevent any directory traversal with sanitized basename of the key
    const safeKey = path.basename(key);
    return path.join(this.uploadDir, safeKey);
  }

  public async saveFile(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.promises.writeFile(filePath, buffer);
  }

  public getFileStream(key: string): fs.ReadStream {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with key ${key} not found in storage.`);
    }
    return fs.createReadStream(filePath);
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

class StorageService {
  private driver: StorageDriver;

  constructor() {
    this.driver = new LocalStorageDriver();
  }

  public setDriver(driver: StorageDriver): void {
    this.driver = driver;
  }

  /**
   * Generate an opaque, unpredictable object key.
   * User filenames are NEVER used as storage paths.
   */
  public generateOpaqueKey(): string {
    return uuidv4();
  }

  public async save(key: string, buffer: Buffer): Promise<void> {
    return this.driver.saveFile(key, buffer);
  }

  public getStream(key: string): fs.ReadStream {
    return this.driver.getFileStream(key);
  }

  public async delete(key: string): Promise<void> {
    return this.driver.deleteFile(key);
  }

  public exists(key: string): boolean {
    return this.driver.fileExists(key);
  }

  public getSize(key: string): number {
    return this.driver.getFileSizeBytes(key);
  }
}

export const storageService = new StorageService();
