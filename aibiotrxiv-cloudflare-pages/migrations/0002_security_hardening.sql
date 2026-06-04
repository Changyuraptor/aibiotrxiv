CREATE TABLE IF NOT EXISTS security_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  actor TEXT,
  target_type TEXT,
  target_id TEXT,
  event_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purge_requests (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  requested_by TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  event_json TEXT
);

CREATE TABLE IF NOT EXISTS r2_object_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT UNIQUE NOT NULL,
  bucket_name TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',
  owner_type TEXT,
  owner_id TEXT,
  version_label TEXT,
  sha256 TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  immutable INTEGER NOT NULL DEFAULT 1,
  retention_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_delete_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  admin_account TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Run these ALTER commands only if the corresponding columns do not already exist.
-- Cloudflare D1 / SQLite cannot add a column twice.
ALTER TABLE members ADD COLUMN password_salt TEXT;
ALTER TABLE members ADD COLUMN comment_status TEXT DEFAULT 'allowed';
ALTER TABLE members ADD COLUMN comment_restriction_reason TEXT;
ALTER TABLE members ADD COLUMN comment_restricted_at TEXT;
ALTER TABLE members ADD COLUMN last_security_review_at TEXT;

ALTER TABLE manuscripts ADD COLUMN soft_deleted INTEGER DEFAULT 0;
ALTER TABLE manuscripts ADD COLUMN deleted_at TEXT;
ALTER TABLE manuscripts ADD COLUMN deleted_by TEXT;
ALTER TABLE manuscripts ADD COLUMN deletion_reason TEXT;
ALTER TABLE manuscripts ADD COLUMN purge_requested INTEGER DEFAULT 0;
ALTER TABLE manuscripts ADD COLUMN purge_requested_at TEXT;

ALTER TABLE peer_comments ADD COLUMN deleted_by_admin TEXT;
ALTER TABLE peer_comments ADD COLUMN deleted_at TEXT;
ALTER TABLE peer_comments ADD COLUMN delete_reason TEXT;
