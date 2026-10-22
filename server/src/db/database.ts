import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseType | null = null;

export interface DatabaseOptions {
  filename?: string;
  inMemory?: boolean;
}

export function initDatabase(options: DatabaseOptions = {}): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  const inMemory = options.inMemory ?? process.env.NODE_ENV === 'test';
  let dbPath: string;

  if (inMemory) {
    dbPath = ':memory:';
  } else {
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = options.filename || path.join(dataDir, 'droplet.sqlite3');
  }

  const db = new Database(dbPath);

  // Enable WAL mode for high concurrency if file-based
  if (!inMemory) {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  // Load and execute schema.sql
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
