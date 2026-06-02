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
-- ---------------------------------------------------------------------
-- v53 additions and compatibility tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id INTEGER,
  session_token_hash TEXT UNIQUE,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  member_email TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  review_status TEXT NOT NULL DEFAULT 'draft',
  paypal_order_id TEXT,
  manuscript_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_waivers (
  id TEXT PRIMARY KEY,
  member_email TEXT NOT NULL,
  reason TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  revoked_by TEXT
);

CREATE TABLE IF NOT EXISTS manuscripts (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT,
  public_id TEXT UNIQUE,
  slug TEXT UNIQUE,
  member_email TEXT,
  article_category TEXT NOT NULL DEFAULT 'AI Research',
  title TEXT NOT NULL,
  abstract TEXT,
  topic TEXT,
  keywords TEXT,
  license TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_latest INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unpublished_at TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'active',
  content_fingerprint TEXT
);

CREATE TABLE IF NOT EXISTS manuscript_versions (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT,
  manuscript_id TEXT,
  source_member_manuscript_id TEXT,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  title TEXT NOT NULL,
  abstract TEXT,
  topic TEXT,
  keywords TEXT,
  license TEXT,
  content_html TEXT,
  pdf_r2_key TEXT,
  html_r2_key TEXT,
  version_note TEXT,
  content_fingerprint TEXT,
  is_latest INTEGER NOT NULL DEFAULT 0,
  is_self_published_revision INTEGER NOT NULL DEFAULT 0,
  payment_required INTEGER NOT NULL DEFAULT 0,
  payment_record_id TEXT,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  editable_until TEXT,
  finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manuscript_version_events (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  reporter_member_id TEXT,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at TEXT,
  handled_by TEXT
);

CREATE TABLE IF NOT EXISTS article_reports (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT,
  manuscript_id TEXT,
  article_key TEXT,
  version_number INTEGER,
  reporter_member_id TEXT,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at TEXT,
  handled_by TEXT
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_member_sessions_hash ON member_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_member ON submissions(member_email);
CREATE INDEX IF NOT EXISTS idx_payment_waivers_email ON payment_waivers(member_email);
CREATE INDEX IF NOT EXISTS idx_manuscripts_public_id ON manuscripts(public_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_slug ON manuscripts(slug);
CREATE INDEX IF NOT EXISTS idx_versions_public_id ON manuscript_versions(manuscript_public_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_article_reports_article ON article_reports(manuscript_public_id);

INSERT OR IGNORE INTO schema_migrations (id, version, description, applied_at)
VALUES (
  'mig_v53_runtime_compatible_schema',
  'v53_runtime_compatible_schema',
  'AIBioTrXiv runtime-compatible D1 schema for Cloudflare Pages Functions',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO payment_waivers (id, member_email, reason, active, created_by, created_at)
VALUES (
  'waiver_changyuraptor_dinosaur_gmail',
  'changyuraptor.dinosaur@gmail.com',
  'Owner testing account: bypass PayPal for workflow testing',
  1,
  'system',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES
  ('site_email', 'aibiotrxiv@gmail.com', CURRENT_TIMESTAMP),
  ('payment_fee_usd', '5.00', CURRENT_TIMESTAMP),
  ('version_free_limit', '15', CURRENT_TIMESTAMP),
  ('version_edit_window_hours', '12', CURRENT_TIMESTAMP);
