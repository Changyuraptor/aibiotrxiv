-- AIBioTrXiv production schema v49
-- D1 is the source of truth for accounts, manuscripts, payment state, moderation, comments, audit logs, and R2 object indexes.

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  suspended_at TEXT,
  suspension_reason TEXT,
  restored_at TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  comment_status TEXT NOT NULL DEFAULT 'allowed',
  comment_suspended INTEGER NOT NULL DEFAULT 0,
  comment_suspension_reason TEXT,
  comment_suspended_at TEXT,
  comment_restored_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS member_manuscripts (
  id TEXT PRIMARY KEY,
  member_email TEXT NOT NULL,
  title TEXT,
  submission_category TEXT NOT NULL DEFAULT 'AI Research',
  research_area TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_waived INTEGER NOT NULL DEFAULT 0,
  payment_waiver_reason TEXT,
  paypal_order_id TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft',
  manuscript_json TEXT NOT NULL,
  article_id TEXT,
  version_label TEXT NOT NULL DEFAULT 'v1',
  version_number INTEGER NOT NULL DEFAULT 1,
  site_id TEXT,
  published_at TEXT,
  deleted_from TEXT,
  deleted_at TEXT,
  purge_requested INTEGER NOT NULL DEFAULT 0,
  purge_requested_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_member ON member_manuscripts(member_email);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_status ON member_manuscripts(review_status,payment_status);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_article ON member_manuscripts(article_id,version_number);

CREATE TABLE IF NOT EXISTS peer_comments (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  member_id TEXT,
  member_email TEXT,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_by_admin TEXT,
  deleted_at TEXT,
  report_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_peer_comments_manuscript ON peer_comments(manuscript_id,status,created_at);

CREATE TABLE IF NOT EXISTS app_files (
  id TEXT PRIMARY KEY,
  owner_email TEXT,
  related_id TEXT,
  r2_key TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_id INTEGER,
  provider TEXT NOT NULL DEFAULT 'paypal',
  provider_order_id TEXT,
  amount_usd TEXT NOT NULL DEFAULT '5.00',
  status TEXT NOT NULL,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paypal_verification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_email TEXT,
  provider_order_id TEXT NOT NULL,
  provider_capture_id TEXT,
  amount_usd TEXT NOT NULL DEFAULT '5.00',
  currency TEXT NOT NULL DEFAULT 'USD',
  verification_status TEXT NOT NULL,
  payment_purpose TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_notification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  admin_email TEXT NOT NULL DEFAULT 'aibiotrxiv@gmail.com',
  provider_order_id TEXT,
  amount_usd TEXT NOT NULL DEFAULT '5.00',
  email_subject TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  email_provider TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS article_version_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  version_label TEXT,
  title TEXT,
  reporter_member_id INTEGER,
  report_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  admin_note TEXT,
  FOREIGN KEY(reporter_member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS member_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_comment_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_by_admin TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
