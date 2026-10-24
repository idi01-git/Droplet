import Database, { Database as DatabaseType } from 'better-sqlite3';
import { createClient, Client as LibsqlClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DatabaseOptions {
  filename?: string;
  inMemory?: boolean;
  tursoUrl?: string;
  tursoAuthToken?: string;
}

export interface DbQueryResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export interface DbExecutor {
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<DbQueryResult>;
  exec(sql: string): Promise<void>;
}

export interface DbClient extends DbExecutor {
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isServerless: boolean;
}

let dbInstance: DatabaseType | null = null;
let libsqlInstance: LibsqlClient | null = null;
let clientWrapper: DbClient | null = null;
let schemaPromise: Promise<void> | null = null;

function normalizeParams(params?: any[]): any[] {
  if (!params) return [];
  return params.map((p) => (p === undefined ? null : p));
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      if (libsqlInstance) {
        await libsqlInstance.executeMultiple(schemaSql);

        // Automatic migration: ensure code column exists on rooms table
        try {
          const tableInfo = await libsqlInstance.execute('PRAGMA table_info(rooms)');
          const hasCodeColumn = tableInfo.rows.some((col: any) => col.name === 'code');
          if (!hasCodeColumn) {
            await libsqlInstance.execute('ALTER TABLE rooms ADD COLUMN code TEXT');
          }
        } catch {
          // Migration check safely ignored if table does not yet exist
        }

        // Automatic migration: ensure upload_reservations has direct storage metadata
        try {
          const resTableInfo = await libsqlInstance.execute('PRAGMA table_info(upload_reservations)');
          if (resTableInfo.rows && resTableInfo.rows.length > 0) {
            if (!resTableInfo.rows.some((col: any) => col.name === 'object_key')) {
              await libsqlInstance.execute('ALTER TABLE upload_reservations ADD COLUMN object_key TEXT');
            }
            if (!resTableInfo.rows.some((col: any) => col.name === 'filename')) {
              await libsqlInstance.execute('ALTER TABLE upload_reservations ADD COLUMN filename TEXT');
            }
            if (!resTableInfo.rows.some((col: any) => col.name === 'mime_type')) {
              await libsqlInstance.execute('ALTER TABLE upload_reservations ADD COLUMN mime_type TEXT');
            }
          }
        } catch {
          // Migration check safely ignored if table does not yet exist
        }
      } else if (dbInstance) {
        dbInstance.exec(schemaSql);

        try {
          const tableInfo = dbInstance.pragma('table_info(rooms)') as { name: string }[];
          const hasCodeColumn = tableInfo.some((col) => col.name === 'code');
          if (!hasCodeColumn) {
            dbInstance.exec('ALTER TABLE rooms ADD COLUMN code TEXT');
          }
        } catch {}

        try {
          const resTableInfo = dbInstance.pragma('table_info(upload_reservations)') as { name: string }[];
          if (resTableInfo && resTableInfo.length > 0) {
            if (!resTableInfo.some((col) => col.name === 'object_key')) {
              dbInstance.exec('ALTER TABLE upload_reservations ADD COLUMN object_key TEXT');
            }
            if (!resTableInfo.some((col) => col.name === 'filename')) {
              dbInstance.exec('ALTER TABLE upload_reservations ADD COLUMN filename TEXT');
            }
            if (!resTableInfo.some((col) => col.name === 'mime_type')) {
              dbInstance.exec('ALTER TABLE upload_reservations ADD COLUMN mime_type TEXT');
            }
          }
        } catch {}
      }
    })();
  }
  return schemaPromise;
}

export function initDatabase(options: DatabaseOptions = {}): DbClient {
  if (clientWrapper) {
    return clientWrapper;
  }

  const tursoUrl = options.tursoUrl || process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = options.tursoAuthToken || process.env.TURSO_AUTH_TOKEN;
  const isTest = process.env.NODE_ENV === 'test';
  const forceInMemory = options.inMemory ?? isTest;

  // Use LibSQL Serverless SQLite if TURSO_DATABASE_URL is provided (unless inMemory forced for unit tests)
  if (tursoUrl && !forceInMemory) {
    const maskedUrl = tursoUrl.replace(/:[^:]*@/, ':***@');
    console.log(`[Droplet DB] Initializing Serverless SQLite via Turso (${maskedUrl})`);

    libsqlInstance = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });

    clientWrapper = {
      isServerless: true,
      get: async <T>(sql: string, params?: any[]) => {
        await ensureDatabaseSchema();
        const res = await libsqlInstance!.execute({ sql, args: normalizeParams(params) });
        return (res.rows[0] as unknown as T) || undefined;
      },
      all: async <T>(sql: string, params?: any[]) => {
        await ensureDatabaseSchema();
        const res = await libsqlInstance!.execute({ sql, args: normalizeParams(params) });
        return res.rows as unknown as T[];
      },
      run: async (sql: string, params?: any[]) => {
        await ensureDatabaseSchema();
        const res = await libsqlInstance!.execute({ sql, args: normalizeParams(params) });
        return {
          changes: res.rowsAffected,
          lastInsertRowid: res.lastInsertRowid !== undefined ? res.lastInsertRowid : undefined,
        };
      },
      exec: async (sql: string) => {
        await ensureDatabaseSchema();
        await libsqlInstance!.executeMultiple(sql);
      },
      transaction: async <T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> => {
        await ensureDatabaseSchema();
        const tx = await libsqlInstance!.transaction('write');
        const txExecutor: DbExecutor = {
          get: async <U>(sql: string, params?: any[]) => {
            const res = await tx.execute({ sql, args: normalizeParams(params) });
            return (res.rows[0] as unknown as U) || undefined;
          },
          all: async <U>(sql: string, params?: any[]) => {
            const res = await tx.execute({ sql, args: normalizeParams(params) });
            return res.rows as unknown as U[];
          },
          run: async (sql: string, params?: any[]) => {
            const res = await tx.execute({ sql, args: normalizeParams(params) });
            return {
              changes: res.rowsAffected,
              lastInsertRowid: res.lastInsertRowid !== undefined ? res.lastInsertRowid : undefined,
            };
          },
          exec: async (sql: string) => {
            await tx.execute(sql);
          },
        };

        try {
          const result = await fn(txExecutor);
          await tx.commit();
          return result;
        } catch (err) {
          try {
            await tx.rollback();
          } catch {}
          throw err;
        }
      },
      close: async () => {
        if (libsqlInstance) {
          libsqlInstance.close();
          libsqlInstance = null;
        }
        clientWrapper = null;
        schemaPromise = null;
      },
    };

    return clientWrapper;
  }

  // Fallback: Local SQLite using better-sqlite3
  let dbPath: string;
  if (forceInMemory) {
    dbPath = ':memory:';
  } else {
    const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = options.filename || path.join(dataDir, 'droplet.sqlite3');
  }

  const db = new Database(dbPath);
  if (!forceInMemory) {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');

  dbInstance = db;

  // Run schema synchronously for local/in-memory SQLite
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  // Automatic migrations for local SQLite
  try {
    const tableInfo = db.pragma('table_info(rooms)') as { name: string }[];
    const hasCodeColumn = tableInfo.some((col) => col.name === 'code');
    if (!hasCodeColumn) {
      db.exec('ALTER TABLE rooms ADD COLUMN code TEXT');
    }
  } catch {}

  try {
    const resTableInfo = db.pragma('table_info(upload_reservations)') as { name: string }[];
    if (resTableInfo && resTableInfo.length > 0) {
      if (!resTableInfo.some((col) => col.name === 'object_key')) {
        db.exec('ALTER TABLE upload_reservations ADD COLUMN object_key TEXT');
      }
      if (!resTableInfo.some((col) => col.name === 'filename')) {
        db.exec('ALTER TABLE upload_reservations ADD COLUMN filename TEXT');
      }
      if (!resTableInfo.some((col) => col.name === 'mime_type')) {
        db.exec('ALTER TABLE upload_reservations ADD COLUMN mime_type TEXT');
      }
    }
  } catch {}

  const localExecutor: DbExecutor = {
    get: async <T>(sql: string, params?: any[]): Promise<T | undefined> => {
      const stmt = db.prepare(sql);
      return (params && params.length > 0 ? stmt.get(...params) : stmt.get()) as T | undefined;
    },
    all: async <T>(sql: string, params?: any[]): Promise<T[]> => {
      const stmt = db.prepare(sql);
      return (params && params.length > 0 ? stmt.all(...params) : stmt.all()) as T[];
    },
    run: async (sql: string, params?: any[]): Promise<DbQueryResult> => {
      const stmt = db.prepare(sql);
      const info = params && params.length > 0 ? stmt.run(...params) : stmt.run();
      return {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid,
      };
    },
    exec: async (sql: string): Promise<void> => {
      db.exec(sql);
    },
  };

  clientWrapper = {
    isServerless: false,
    ...localExecutor,
    transaction: async <T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(localExecutor);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {}
        throw err;
      }
    },
    close: async () => {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
      clientWrapper = null;
      schemaPromise = null;
    },
  };

  return clientWrapper;
}

export function getDb(): DbClient {
  if (!clientWrapper) {
    return initDatabase();
  }
  return clientWrapper;
}

export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    initDatabase();
  }
  if (!dbInstance) {
    throw new Error('getDatabase() called in serverless LibSQL mode where better-sqlite3 is inactive.');
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  if (libsqlInstance) {
    libsqlInstance.close();
    libsqlInstance = null;
  }
  clientWrapper = null;
  schemaPromise = null;
}
