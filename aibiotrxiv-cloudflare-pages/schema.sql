CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  topic TEXT NOT NULL,
  manuscript_type TEXT,
  authors TEXT NOT NULL,
  email TEXT NOT NULL,
  affiliation TEXT,
  ai_use_statement TEXT,
  license TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS submission_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  heading TEXT NOT NULL,
  body_text TEXT,
  figure_r2_key TEXT,
  figure_mime TEXT,
  legend TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
CREATE TABLE IF NOT EXISTS manuscripts (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  topic TEXT NOT NULL,
  authors TEXT NOT NULL,
  published_at TEXT,
  version TEXT DEFAULT 'v1',
  status TEXT DEFAULT 'published',
  pdf_r2_key TEXT,
  citation TEXT,
  license TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);
CREATE TABLE IF NOT EXISTS manuscript_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manuscript_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  pdf_r2_key TEXT,
  change_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id)
);


-- v18 membership and payment workflow prototype schema
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  suspended_at TEXT,
  suspension_reason TEXT,
  restored_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_manuscripts (
  id TEXT PRIMARY KEY,
  member_email TEXT NOT NULL,
  title TEXT,
  submission_category TEXT DEFAULT 'AI Research',
  research_area TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  payment_waived INTEGER DEFAULT 0,
  payment_waiver_reason TEXT,
  paypal_order_id TEXT,
  review_status TEXT DEFAULT 'draft',
  manuscript_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- v19 account verification, credit protection, and D1/R2-ready storage model
-- These tables are designed for Cloudflare D1. Store large binary files in R2 and keep only object keys here.

ALTER TABLE submissions ADD COLUMN submission_category TEXT DEFAULT 'AI Research';
ALTER TABLE submissions ADD COLUMN member_id INTEGER;
ALTER TABLE submissions ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE submissions ADD COLUMN payment_waived INTEGER DEFAULT 0;
ALTER TABLE submissions ADD COLUMN payment_waiver_reason TEXT;
ALTER TABLE submissions ADD COLUMN paypal_order_id TEXT;
ALTER TABLE submissions ADD COLUMN review_status TEXT DEFAULT 'draft';
ALTER TABLE submissions ADD COLUMN record_fingerprint TEXT;
ALTER TABLE submissions ADD COLUMN credit_notice TEXT;
ALTER TABLE submissions ADD COLUMN timestamped_at TEXT;
ALTER TABLE submissions ADD COLUMN public_record_json TEXT;

ALTER TABLE members ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN verified_at TEXT;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS submission_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  section_id INTEGER,
  original_filename TEXT,
  r2_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER,
  sha256 TEXT,
  figure_order INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (section_id) REFERENCES submission_sections(id)
);

CREATE TABLE IF NOT EXISTS submission_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_id INTEGER,
  event_type TEXT NOT NULL,
  event_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS payment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_id INTEGER NOT NULL,
  provider TEXT DEFAULT 'paypal',
  provider_order_id TEXT,
  amount_usd TEXT DEFAULT '5.00',
  status TEXT NOT NULL,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);


-- Peer comments for published manuscripts. Store comments in D1 and moderate spam/harassment.
CREATE TABLE IF NOT EXISTS peer_comments (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS member_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS payment_notification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_email TEXT NOT NULL,
  admin_email TEXT NOT NULL DEFAULT 'aibiotrxiv@gmail.com',
  provider_order_id TEXT,
  amount_usd TEXT DEFAULT '5.00',
  email_subject TEXT,
  email_sent INTEGER DEFAULT 0,
  email_provider TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- v29 versioning model: bioRxiv-like revision history.
-- Each article keeps a stable article_id. Every accepted revision is stored as a new version row.
CREATE TABLE IF NOT EXISTS manuscript_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  version_label TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  manuscript_json TEXT NOT NULL,
  pdf_r2_key TEXT,
  html_r2_key TEXT,
  license TEXT,
  version_note TEXT,
  created_by_member_id INTEGER,
  submitted_at TEXT,
  accepted_at TEXT,
  published_at TEXT,
  content_fingerprint TEXT,
  is_latest INTEGER DEFAULT 0,
  FOREIGN KEY(created_by_member_id) REFERENCES members(id)
);
CREATE INDEX IF NOT EXISTS idx_manuscript_versions_article ON manuscript_versions(article_id, version_number);
CREATE INDEX IF NOT EXISTS idx_manuscript_versions_latest ON manuscript_versions(article_id, is_latest);

-- Version events preserve credit and traceability.
CREATE TABLE IF NOT EXISTS manuscript_version_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  version_label TEXT,
  event_type TEXT NOT NULL,
  event_note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- v30 post-v1 revision policy: after the first paid, accepted publication,
-- author-submitted later versions can be self-published without additional PayPal fee or editorial screening.
-- Preserve all versions for credit/timestamp traceability and enable moderation by reports.
ALTER TABLE manuscript_versions ADD COLUMN self_published_revision INTEGER DEFAULT 0;
ALTER TABLE manuscript_versions ADD COLUMN moderation_status TEXT DEFAULT 'visible';

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

-- v31 post-publication version fee and lock policy.
ALTER TABLE manuscript_versions ADD COLUMN correction_window_hours INTEGER DEFAULT 12;
ALTER TABLE manuscript_versions ADD COLUMN correction_window_closes_at TEXT;
ALTER TABLE manuscript_versions ADD COLUMN grace_updated_at TEXT;
ALTER TABLE manuscript_versions ADD COLUMN requires_revision_fee INTEGER DEFAULT 0;
ALTER TABLE manuscript_versions ADD COLUMN revision_fee_paid_at TEXT;
ALTER TABLE manuscript_versions ADD COLUMN revision_fee_paypal_order_id TEXT;
-- Draft edits before first publication remain v1. Version numbers are counted only after public publication.
-- Versions v2-v15 are author self-published without additional fee. Versions v16+ require US$5 platform maintenance fee.

-- v37 persistent storage and separated enforcement model.
-- Full account suspension and peer-comment restriction must be tracked separately.
ALTER TABLE members ADD COLUMN comment_status TEXT DEFAULT 'allowed';
ALTER TABLE members ADD COLUMN comment_suspended INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN comment_suspension_reason TEXT;
ALTER TABLE members ADD COLUMN comment_suspended_at TEXT;
ALTER TABLE members ADD COLUMN comment_restored_at TEXT;

CREATE TABLE IF NOT EXISTS member_comment_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_by_admin TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE peer_comments ADD COLUMN deleted_by_admin TEXT;
ALTER TABLE peer_comments ADD COLUMN deleted_at TEXT;
ALTER TABLE peer_comments ADD COLUMN report_count INTEGER DEFAULT 0;

-- R2 object registry: keeps metadata in D1 while binary files remain in R2.
CREATE TABLE IF NOT EXISTS storage_objects (
  id TEXT PRIMARY KEY,
  owner_member_id TEXT,
  related_submission_id TEXT,
  related_article_id TEXT,
  object_type TEXT NOT NULL,
  r2_bucket TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',
  r2_key TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  sha256 TEXT,
  created_at TEXT NOT NULL
);

-- v40 PayPal server-side verification audit records.
CREATE TABLE IF NOT EXISTS paypal_verification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_email TEXT,
  provider_order_id TEXT NOT NULL,
  provider_capture_id TEXT,
  amount_usd TEXT DEFAULT '5.00',
  currency TEXT DEFAULT 'USD',
  verification_status TEXT NOT NULL,
  payment_purpose TEXT,
  raw_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- v41 security hardening: audit log, rate limiting, soft-delete/purge quarantine, and immutable R2 object tracking.
-- If a column already exists in an existing D1 database, run only the migration file instead of re-running the full schema.
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
