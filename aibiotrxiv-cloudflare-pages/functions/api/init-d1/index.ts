const SCHEMA = `-- AIBioTrXiv production D1 schema v49
-- D1 database: aibiotrxiv-production-db
-- D1 binding: DB
-- R2 bucket: aibiotrxiv-user-content
-- R2 binding: AIBIO_STORAGE

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  description TEXT,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  account_status TEXT NOT NULL DEFAULT 'active',
  comment_status TEXT NOT NULL DEFAULT 'allowed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  suspended_at TEXT,
  suspended_by TEXT,
  suspension_reason TEXT,
  comments_restricted_at TEXT,
  comments_restricted_by TEXT,
  comments_restriction_reason TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_manuscripts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  article_category TEXT NOT NULL DEFAULT 'AI Research',
  title TEXT NOT NULL,
  abstract TEXT,
  topic TEXT,
  manuscript_type TEXT,
  keywords TEXT,
  license TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  review_status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  credit_statement TEXT,
  ai_use_statement TEXT,
  rights_confirmation INTEGER NOT NULL DEFAULT 0,
  content_fingerprint TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  accepted_at TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  published_at TEXT,
  unpublished_at TEXT,
  deleted_at TEXT,
  deleted_by TEXT,
  delete_reason TEXT,
  previous_status TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
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
  FOREIGN KEY(manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE
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
  FOREIGN KEY(manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE
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
  FOREIGN KEY(manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE,
  FOREIGN KEY(section_id) REFERENCES member_manuscript_sections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  manuscript_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  amount TEXT NOT NULL DEFAULT '5.00',
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_reason TEXT NOT NULL DEFAULT 'submission_processing_fee',
  verified_by_server INTEGER NOT NULL DEFAULT 0,
  verification_response_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  FOREIGN KEY(manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
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
  public_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  member_id TEXT,
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
  content_fingerprint TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE SET NULL,
  FOREIGN KEY(manuscript_id) REFERENCES member_manuscripts(id) ON DELETE SET NULL
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
  FOREIGN KEY(manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manuscript_versions (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT NOT NULL,
  manuscript_id TEXT,
  source_member_manuscript_id TEXT,
  version_number INTEGER NOT NULL,
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
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE,
  FOREIGN KEY(source_member_manuscript_id) REFERENCES member_manuscripts(id) ON DELETE SET NULL,
  FOREIGN KEY(payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS peer_comments (
  id TEXT PRIMARY KEY,
  manuscript_public_id TEXT NOT NULL,
  version_number INTEGER,
  member_id TEXT NOT NULL,
  comment_html TEXT NOT NULL,
  comment_text TEXT,
  status TEXT NOT NULL DEFAULT 'visible',
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by_admin TEXT,
  deleted_at TEXT,
  delete_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
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
  FOREIGN KEY(comment_id) REFERENCES peer_comments(id) ON DELETE CASCADE,
  FOREIGN KEY(reporter_member_id) REFERENCES members(id) ON DELETE SET NULL
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
  handled_by TEXT,
  FOREIGN KEY(reporter_member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS member_enforcement_events (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  enforcement_type TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restored_at TEXT,
  restored_by TEXT,
  FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_delete_events (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_status TEXT,
  delete_action TEXT NOT NULL,
  admin_account TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purge_requests (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  requested_by TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  completed_by TEXT
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
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  bucket_name TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',
  owner_type TEXT,
  owner_id TEXT,
  object_role TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  immutable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS security_audit_events (
  id TEXT PRIMARY KEY,
  actor_type TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  id TEXT PRIMARY KEY,
  rate_key TEXT NOT NULL,
  route TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(account_status);
CREATE INDEX IF NOT EXISTS idx_email_tokens_member ON email_verification_tokens(member_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_member_sessions_hash ON member_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_member_sessions_member ON member_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_member ON member_manuscripts(member_id);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_status ON member_manuscripts(status);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_payment ON member_manuscripts(payment_status);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_review ON member_manuscripts(review_status);
CREATE INDEX IF NOT EXISTS idx_member_authors_manuscript ON member_manuscript_authors(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_member_sections_manuscript ON member_manuscript_sections(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_member_figures_manuscript ON member_manuscript_figures(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_manuscript ON payment_records(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_member ON payment_records(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order ON payment_records(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_waivers_email ON payment_waivers(member_email);
CREATE INDEX IF NOT EXISTS idx_manuscripts_public_id ON manuscripts(public_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_slug ON manuscripts(slug);
CREATE INDEX IF NOT EXISTS idx_manuscripts_member ON manuscripts(member_id);
CREATE INDEX IF NOT EXISTS idx_versions_public_id ON manuscript_versions(manuscript_public_id);
CREATE INDEX IF NOT EXISTS idx_versions_manuscript ON manuscript_versions(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_peer_comments_article ON peer_comments(manuscript_public_id);
CREATE INDEX IF NOT EXISTS idx_peer_comments_member ON peer_comments(member_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_article_reports_article ON article_reports(manuscript_public_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_member ON member_enforcement_events(member_id);
CREATE INDEX IF NOT EXISTS idx_app_files_owner ON app_files(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_r2_registry_key ON r2_object_registry(r2_key);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_events(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON security_audit_events(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_security_rate_key ON security_rate_limits(rate_key, route);

INSERT OR IGNORE INTO schema_migrations (id, version, description, applied_at)
VALUES ('mig_v49_complete_d1_schema', 'v49_complete_d1_schema', 'Complete AIBioTrXiv D1 schema for production D1/R2 storage.', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO payment_waivers (id, member_email, reason, active, created_by, created_at)
VALUES ('waiver_changyuraptor_dinosaur_gmail', 'changyuraptor.dinosaur@gmail.com', 'Owner testing account: bypass PayPal for workflow testing', 1, 'system', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES
  ('site_email', 'aibiotrxiv@gmail.com', CURRENT_TIMESTAMP),
  ('payment_fee_usd', '5.00', CURRENT_TIMESTAMP),
  ('version_free_limit', '15', CURRENT_TIMESTAMP),
  ('version_edit_window_hours', '12', CURRENT_TIMESTAMP);
`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function exists(db: any, table: string) {
  const row = await db
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
    .bind(table)
    .first();
  return !!row;
}

export async function onRequestGet({ env, request }: any) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret") || "";

  if (!env.DB) {
    return json({ ok: false, error: "D1 binding DB is missing." }, 500);
  }

  if (!env.INIT_DATABASE_SECRET) {
    return json({ ok: false, error: "INIT_DATABASE_SECRET is not configured." }, 500);
  }

  if (secret !== env.INIT_DATABASE_SECRET) {
    return json({ ok: false, error: "Invalid initialization secret." }, 403);
  }

  try {
    const before: Record<string, boolean> = {};
    const required = [
      "members",
      "app_settings",
      "email_verification_tokens",
      "member_manuscripts",
      "payment_records",
      "peer_comments",
      "app_files",
      "security_audit_events"
    ];

    for (const t of required) before[t] = await exists(env.DB, t);

    const result = await env.DB.exec(SCHEMA);

    const after: Record<string, boolean> = {};
    for (const t of required) after[t] = await exists(env.DB, t);

    const missing = Object.entries(after)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    return json({
      ok: missing.length === 0,
      message: missing.length === 0
        ? "AIBioTrXiv D1 schema initialized successfully."
        : "Schema ran, but some required tables are still missing.",
      before,
      after,
      missing,
      result
    }, missing.length === 0 ? 200 : 500);
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e), stack: e?.stack || null }, 500);
  }
}
