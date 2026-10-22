-- Droplet SQLite Database Schema
-- Source of Truth: Droplet_Agent_Spec.md Section 9

PRAGMA foreign_keys = ON;

-- 1. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
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
    FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON upload_reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON upload_reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON upload_reservations(expires_at);
