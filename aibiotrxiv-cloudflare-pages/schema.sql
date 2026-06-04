-- AIBioTrXiv production D1 schema v55
-- Database name: aibiotrxiv-production-db
-- Pages binding name: DB
-- R2 bucket name: aibiotrxiv-user-content
-- R2 binding name: AIBIO_STORAGE

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  account_status TEXT NOT NULL DEFAULT 'active',
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  last_login_at TEXT,
  auth_provider TEXT,
  provider_user_id TEXT,
  avatar_url TEXT
);


CREATE TABLE IF NOT EXISTS member_oauth_accounts (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  provider_display_name TEXT,
  provider_avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  UNIQUE(provider, provider_user_id),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  used INTEGER NOT NULL DEFAULT 0,
  used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  topic TEXT NOT NULL,
  manuscript_type TEXT,
  submission_category TEXT DEFAULT 'AI Research',
  authors TEXT NOT NULL,
  email TEXT NOT NULL,
  affiliation TEXT,
  ai_use_statement TEXT,
  license TEXT,
  status TEXT DEFAULT 'submitted',
  member_id INTEGER,
  payment_status TEXT DEFAULT 'unpaid',
  payment_waived INTEGER DEFAULT 0,
  payment_waiver_reason TEXT,
  paypal_order_id TEXT,
  review_status TEXT DEFAULT 'draft',
  record_fingerprint TEXT,
  credit_notice TEXT,
  timestamped_at TEXT,
  public_record_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
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
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
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
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES submission_sections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS submission_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  member_id INTEGER,
  event_type TEXT NOT NULL,
  event_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_manuscripts (
  id TEXT PRIMARY KEY,
  member_email TEXT NOT NULL,
  member_id INTEGER,
  title TEXT,
  submission_category TEXT NOT NULL DEFAULT 'AI Research',
  article_category TEXT DEFAULT 'AI Research',
  research_area TEXT,
  topic TEXT,
  abstract TEXT,
  keywords TEXT,
  license TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_waived INTEGER NOT NULL DEFAULT 0,
  payment_waiver_reason TEXT,
  paypal_order_id TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft',
  status TEXT NOT NULL DEFAULT 'draft',
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
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_manuscript_authors (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL,
  author_email TEXT,
  affiliation TEXT,
  is_corresponding INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_manuscript_sections (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  section_type TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  heading TEXT,
  content_html TEXT,
  content_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_manuscript_figures (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  section_id TEXT,
  figure_order INTEGER NOT NULL DEFAULT 0,
  filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  r2_key TEXT,
  legend_html TEXT,
  legend_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES member_manuscript_sections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT,
  manuscript_id TEXT,
  member_id INTEGER,
  provider TEXT DEFAULT 'paypal',
  provider_order_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  amount_usd TEXT DEFAULT '5.00',
  amount TEXT DEFAULT '5.00',
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reason TEXT NOT NULL DEFAULT 'submission_processing_fee',
  verified_by_server INTEGER NOT NULL DEFAULT 0,
  raw_response_json TEXT,
  verification_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS manuscripts (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  manuscript_id TEXT,
  public_id TEXT UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  member_id INTEGER,
  article_category TEXT NOT NULL DEFAULT 'AI Research',
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  topic TEXT NOT NULL,
  authors TEXT,
  keywords TEXT,
  license TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_latest INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  unpublished_at TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'active',
  status TEXT DEFAULT 'published',
  pdf_r2_key TEXT,
  citation TEXT,
  version TEXT DEFAULT 'v1',
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS manuscript_authors (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL,
  author_email TEXT,
  affiliation TEXT,
  is_corresponding INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manuscript_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manuscript_id TEXT,
  manuscript_public_id TEXT,
  article_id TEXT,
  submission_id TEXT,
  version_label TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  topic TEXT,
  keywords TEXT,
  manuscript_json TEXT,
  content_html TEXT,
  pdf_r2_key TEXT,
  html_r2_key TEXT,
  license TEXT,
  version_note TEXT,
  change_note TEXT,
  created_by_member_id INTEGER,
  submitted_at TEXT,
  accepted_at TEXT,
  published_at TEXT,
  content_fingerprint TEXT,
  is_latest INTEGER DEFAULT 0,
  self_published_revision INTEGER DEFAULT 0,
  is_self_published_revision INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'visible',
  correction_window_hours INTEGER DEFAULT 12,
  correction_window_closes_at TEXT,
  grace_updated_at TEXT,
  requires_revision_fee INTEGER DEFAULT 0,
  revision_fee_paid_at TEXT,
  revision_fee_paypal_order_id TEXT,
  payment_required INTEGER DEFAULT 0,
  payment_record_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by_member_id) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY(payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS manuscript_version_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT,
  manuscript_public_id TEXT,
  version_label TEXT,
  version_number INTEGER,
  event_type TEXT NOT NULL,
  event_note TEXT,
  created_by TEXT,
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
  FOREIGN KEY(reporter_member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS peer_comments (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  manuscript_public_id TEXT,
  version_number INTEGER,
  member_id TEXT NOT NULL,
  member_email TEXT,
  comment_html TEXT,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by_admin TEXT,
  deleted_at TEXT,
  delete_reason TEXT,
  report_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
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
  handled_by TEXT,
  FOREIGN KEY (comment_id) REFERENCES peer_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS article_reports (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS member_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  enforcement_type TEXT,
  event_type TEXT,
  action TEXT,
  reason TEXT,
  created_by TEXT,
  created_by_admin TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restored_at TEXT,
  restored_by TEXT
);

CREATE TABLE IF NOT EXISTS member_comment_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reason TEXT,
  created_by_admin TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_files (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  file_role TEXT NOT NULL,
  filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS r2_object_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT UNIQUE,
  object_key TEXT UNIQUE,
  bucket_name TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',
  owner_type TEXT,
  owner_id TEXT,
  object_role TEXT,
  version_label TEXT,
  sha256 TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  immutable INTEGER NOT NULL DEFAULT 1,
  retention_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS security_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  actor TEXT,
  actor_type TEXT,
  actor_id TEXT,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  event_json TEXT,
  details_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  id TEXT PRIMARY KEY,
  key TEXT,
  rate_key TEXT,
  route TEXT,
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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  completed_at TEXT,
  completed_by TEXT,
  event_json TEXT
);

CREATE TABLE IF NOT EXISTS admin_delete_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  delete_action TEXT,
  admin_account TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_oauth_provider_user ON member_oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_member ON member_oauth_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_email_tokens_member ON email_verification_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_member_sessions_hash ON member_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_member ON member_manuscripts(member_email);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_status ON member_manuscripts(review_status,payment_status);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_article ON member_manuscripts(article_id,version_number);
CREATE INDEX IF NOT EXISTS idx_payment_records_submission ON payment_records(submission_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order ON payment_records(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_waivers_email ON payment_waivers(member_email);
CREATE INDEX IF NOT EXISTS idx_manuscripts_slug ON manuscripts(slug);
CREATE INDEX IF NOT EXISTS idx_manuscripts_public_id ON manuscripts(public_id);
CREATE INDEX IF NOT EXISTS idx_manuscript_versions_article ON manuscript_versions(article_id, version_number);
CREATE INDEX IF NOT EXISTS idx_manuscript_versions_latest ON manuscript_versions(article_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_peer_comments_article ON peer_comments(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_peer_comments_member ON peer_comments(member_id);
CREATE INDEX IF NOT EXISTS idx_app_files_owner ON app_files(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_r2_registry_key ON r2_object_registry(r2_key);
CREATE INDEX IF NOT EXISTS idx_r2_registry_object_key ON r2_object_registry(object_key);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_events(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_rate_key ON security_rate_limits(key, window_start);

INSERT OR IGNORE INTO schema_migrations (id, version, description, applied_at)
VALUES ('mig_v55_compat_schema', 'v55_compat_schema', 'D1 schema compatible with v46 site plus D1/R2 diagnostics and initializer', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO payment_waivers (id, member_email, reason, active, created_by, created_at)
VALUES ('waiver_changyuraptor_dinosaur_gmail', 'changyuraptor.dinosaur@gmail.com', 'Owner testing account: bypass PayPal for workflow testing', 1, 'system', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES
  ('site_email', 'aibiotrxiv@gmail.com', CURRENT_TIMESTAMP),
  ('payment_fee_usd', '5.00', CURRENT_TIMESTAMP),
  ('version_free_limit', '15', CURRENT_TIMESTAMP),
  ('version_edit_window_hours', '12', CURRENT_TIMESTAMP),
  ('member_auth_mode', 'oauth_only', CURRENT_TIMESTAMP);


CREATE TABLE IF NOT EXISTS app_kv_storage (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
