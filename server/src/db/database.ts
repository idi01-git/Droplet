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

const DEFAULT_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT,
    code_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'deleting', 'deleted')),
    owner_session_hash TEXT,
    used_bytes INTEGER NOT NULL DEFAULT 0,
    reserved_bytes INTEGER NOT NULL DEFAULT 0,
    file_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_code_hash ON rooms(code_hash);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

-- 2. Sessions Table (Owner vs Participant)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('owner', 'participant')),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_room_id ON sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 3. Items Table (Text, Links, Files)
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    session_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('text', 'link', 'file')),
    text_content TEXT,
    object_key TEXT,
    filename TEXT,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_items_room_id ON items(room_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);

-- 4. Upload Reservations Table (Atomic concurrency & quota guarantees)
CREATE TABLE IF NOT EXISTS upload_reservations (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    expected_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'cancelled', 'timed_out')),
    object_key TEXT,
    filename TEXT,
    mime_type TEXT,
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON upload_reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON upload_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON upload_reservations(expires_at);
`;

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
      try {
        let schemaSql: string;
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          schemaSql = fs.readFileSync(schemaPath, 'utf8');
        } else {
          schemaSql = DEFAULT_SCHEMA_SQL;
        }

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
      } catch (err) {
        schemaPromise = null; // Always reset so future requests can retry and self-heal
        throw err;
      }
    })();
  }
  return schemaPromise;
}

export function initDatabase(options: DatabaseOptions = {}): DbClient {
  if (clientWrapper) {
    return clientWrapper;
  }

  const rawTursoUrl = options.tursoUrl || process.env.TURSO_DATABASE_URL;
  const tursoUrl = rawTursoUrl ? rawTursoUrl.trim() : undefined;
  const rawAuthToken = options.tursoAuthToken || process.env.TURSO_AUTH_TOKEN;
  const tursoAuthToken = rawAuthToken ? rawAuthToken.trim() : undefined;
  const isTest = process.env.NODE_ENV === 'test';
  const forceInMemory = options.inMemory ?? isTest;

  const isRemoteTurso = !!tursoUrl && !tursoUrl.startsWith('file:') && tursoUrl !== ':memory:';

  // If a remote Turso database is configured, verify that an auth token is provided.
  // If missing, log a clear warning and fall back to local SQLite to guarantee 100% uptime.
  if (isRemoteTurso && !tursoAuthToken && !forceInMemory) {
    console.warn(
      `[Droplet DB WARNING] TURSO_DATABASE_URL is configured (${tursoUrl}) but TURSO_AUTH_TOKEN is missing or empty.\n` +
      `Falling back to local SQLite to ensure uninterrupted service.`
    );
  }

  const shouldUseLibSql = !!tursoUrl && !forceInMemory && (!isRemoteTurso || !!tursoAuthToken);

  // Use LibSQL Serverless SQLite if configured and credentials valid
  if (shouldUseLibSql && tursoUrl) {
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
  const schemaSql = fs.existsSync(schemaPath)
    ? fs.readFileSync(schemaPath, 'utf8')
    : DEFAULT_SCHEMA_SQL;
  db.exec(schemaSql);

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
