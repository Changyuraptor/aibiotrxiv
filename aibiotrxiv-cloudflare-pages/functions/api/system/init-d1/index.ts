// AIBioTrXiv D1 initializer v57
// Route examples:
//   /api/system/init-d1?secret=...
//   /api/system/initd1?secret=...
//   /api/init-d1?secret=...
//   /api/init-database?secret=...
//
// Required Cloudflare Pages secret:
//   INIT_DATABASE_SECRET
//
// This version executes SQL one statement at a time with env.DB.prepare(...).run()
// instead of DB.exec(fullSchema), because D1 may fail on a long SQL script
// starting with comments or mixed multi-statement input.

export interface Env {
  DB: D1Database;
  INIT_DATABASE_SECRET?: string;
}

const STATEMENTS: string[] = ["PRAGMA foreign_keys = ON", "CREATE TABLE IF NOT EXISTS app_settings (\n  key TEXT PRIMARY KEY,\n  value TEXT,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS schema_migrations (\n  id TEXT PRIMARY KEY,\n  version TEXT NOT NULL UNIQUE,\n  description TEXT,\n  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS members (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  display_name TEXT,\n  email TEXT UNIQUE NOT NULL,\n  password_hash TEXT NOT NULL,\n  password_salt TEXT,\n  status TEXT NOT NULL DEFAULT 'active',\n  account_status TEXT NOT NULL DEFAULT 'active',\n  suspended_at TEXT,\n  suspension_reason TEXT,\n  restored_at TEXT,\n  email_verified INTEGER NOT NULL DEFAULT 0,\n  verified_at TEXT,\n  comment_status TEXT NOT NULL DEFAULT 'allowed',\n  comment_suspended INTEGER NOT NULL DEFAULT 0,\n  comment_suspension_reason TEXT,\n  comment_suspended_at TEXT,\n  comment_restored_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT,\n  last_login_at TEXT\n)", "CREATE TABLE IF NOT EXISTS email_verification_tokens (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  member_id INTEGER NOT NULL,\n  email TEXT NOT NULL,\n  token_hash TEXT NOT NULL UNIQUE,\n  used INTEGER NOT NULL DEFAULT 0,\n  used_at TEXT,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS member_sessions (\n  id TEXT PRIMARY KEY,\n  member_id INTEGER NOT NULL,\n  session_token_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  last_seen_at TEXT,\n  ip_address TEXT,\n  user_agent TEXT,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS password_reset_tokens (\n  id TEXT PRIMARY KEY,\n  member_id INTEGER NOT NULL,\n  email TEXT NOT NULL,\n  token_hash TEXT NOT NULL UNIQUE,\n  expires_at TEXT NOT NULL,\n  used_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS submissions (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  abstract TEXT NOT NULL,\n  topic TEXT NOT NULL,\n  manuscript_type TEXT,\n  submission_category TEXT DEFAULT 'AI Research',\n  authors TEXT NOT NULL,\n  email TEXT NOT NULL,\n  affiliation TEXT,\n  ai_use_statement TEXT,\n  license TEXT,\n  status TEXT DEFAULT 'submitted',\n  member_id INTEGER,\n  payment_status TEXT DEFAULT 'unpaid',\n  payment_waived INTEGER DEFAULT 0,\n  payment_waiver_reason TEXT,\n  paypal_order_id TEXT,\n  review_status TEXT DEFAULT 'draft',\n  record_fingerprint TEXT,\n  credit_notice TEXT,\n  timestamped_at TEXT,\n  public_record_json TEXT,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS submission_sections (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT NOT NULL,\n  section_order INTEGER NOT NULL,\n  heading TEXT NOT NULL,\n  body_text TEXT,\n  figure_r2_key TEXT,\n  figure_mime TEXT,\n  legend TEXT,\n  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS submission_files (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT NOT NULL,\n  section_id INTEGER,\n  original_filename TEXT,\n  r2_key TEXT NOT NULL,\n  mime_type TEXT NOT NULL,\n  file_size INTEGER,\n  sha256 TEXT,\n  figure_order INTEGER,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,\n  FOREIGN KEY (section_id) REFERENCES submission_sections(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS submission_audit_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT NOT NULL,\n  member_id INTEGER,\n  event_type TEXT NOT NULL,\n  event_json TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS member_manuscripts (\n  id TEXT PRIMARY KEY,\n  member_email TEXT NOT NULL,\n  member_id INTEGER,\n  title TEXT,\n  submission_category TEXT NOT NULL DEFAULT 'AI Research',\n  article_category TEXT DEFAULT 'AI Research',\n  research_area TEXT,\n  topic TEXT,\n  abstract TEXT,\n  keywords TEXT,\n  license TEXT,\n  payment_status TEXT NOT NULL DEFAULT 'unpaid',\n  payment_waived INTEGER NOT NULL DEFAULT 0,\n  payment_waiver_reason TEXT,\n  paypal_order_id TEXT,\n  review_status TEXT NOT NULL DEFAULT 'draft',\n  status TEXT NOT NULL DEFAULT 'draft',\n  manuscript_json TEXT NOT NULL,\n  article_id TEXT,\n  version_label TEXT NOT NULL DEFAULT 'v1',\n  version_number INTEGER NOT NULL DEFAULT 1,\n  site_id TEXT,\n  published_at TEXT,\n  deleted_from TEXT,\n  deleted_at TEXT,\n  purge_requested INTEGER NOT NULL DEFAULT 0,\n  purge_requested_at TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS member_manuscript_authors (\n  id TEXT PRIMARY KEY,\n  manuscript_id TEXT NOT NULL,\n  author_order INTEGER NOT NULL DEFAULT 0,\n  author_name TEXT NOT NULL,\n  author_email TEXT,\n  affiliation TEXT,\n  is_corresponding INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT,\n  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS member_manuscript_sections (\n  id TEXT PRIMARY KEY,\n  manuscript_id TEXT NOT NULL,\n  section_type TEXT NOT NULL,\n  section_order INTEGER NOT NULL DEFAULT 0,\n  heading TEXT,\n  content_html TEXT,\n  content_text TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS member_manuscript_figures (\n  id TEXT PRIMARY KEY,\n  manuscript_id TEXT NOT NULL,\n  section_id TEXT,\n  figure_order INTEGER NOT NULL DEFAULT 0,\n  filename TEXT,\n  mime_type TEXT,\n  size_bytes INTEGER,\n  r2_key TEXT,\n  legend_html TEXT,\n  legend_text TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT,\n  FOREIGN KEY (manuscript_id) REFERENCES member_manuscripts(id) ON DELETE CASCADE,\n  FOREIGN KEY (section_id) REFERENCES member_manuscript_sections(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS payment_records (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT,\n  manuscript_id TEXT,\n  member_id INTEGER,\n  provider TEXT DEFAULT 'paypal',\n  provider_order_id TEXT,\n  paypal_order_id TEXT,\n  paypal_capture_id TEXT,\n  amount_usd TEXT DEFAULT '5.00',\n  amount TEXT DEFAULT '5.00',\n  currency TEXT NOT NULL DEFAULT 'USD',\n  status TEXT NOT NULL DEFAULT 'pending',\n  payment_status TEXT NOT NULL DEFAULT 'pending',\n  payment_reason TEXT NOT NULL DEFAULT 'submission_processing_fee',\n  verified_by_server INTEGER NOT NULL DEFAULT 0,\n  raw_response_json TEXT,\n  verification_response_json TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  verified_at TEXT,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS payment_waivers (\n  id TEXT PRIMARY KEY,\n  member_email TEXT NOT NULL,\n  reason TEXT,\n  active INTEGER NOT NULL DEFAULT 1,\n  created_by TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  revoked_at TEXT,\n  revoked_by TEXT\n)", "CREATE TABLE IF NOT EXISTS payment_notification_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT NOT NULL,\n  member_email TEXT NOT NULL,\n  admin_email TEXT NOT NULL DEFAULT 'aibiotrxiv@gmail.com',\n  provider_order_id TEXT,\n  amount_usd TEXT DEFAULT '5.00',\n  email_subject TEXT,\n  email_sent INTEGER DEFAULT 0,\n  email_provider TEXT,\n  raw_response_json TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS paypal_verification_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  submission_id TEXT NOT NULL,\n  member_email TEXT,\n  provider_order_id TEXT NOT NULL,\n  provider_capture_id TEXT,\n  amount_usd TEXT DEFAULT '5.00',\n  currency TEXT DEFAULT 'USD',\n  verification_status TEXT NOT NULL,\n  payment_purpose TEXT,\n  raw_response_json TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS manuscripts (\n  id TEXT PRIMARY KEY,\n  submission_id TEXT,\n  manuscript_id TEXT,\n  public_id TEXT UNIQUE,\n  slug TEXT UNIQUE NOT NULL,\n  member_id INTEGER,\n  article_category TEXT NOT NULL DEFAULT 'AI Research',\n  title TEXT NOT NULL,\n  abstract TEXT NOT NULL,\n  topic TEXT NOT NULL,\n  authors TEXT,\n  keywords TEXT,\n  license TEXT,\n  current_version INTEGER NOT NULL DEFAULT 1,\n  is_published INTEGER NOT NULL DEFAULT 1,\n  is_latest INTEGER NOT NULL DEFAULT 1,\n  published_at TEXT,\n  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  unpublished_at TEXT,\n  moderation_status TEXT NOT NULL DEFAULT 'active',\n  status TEXT DEFAULT 'published',\n  pdf_r2_key TEXT,\n  citation TEXT,\n  version TEXT DEFAULT 'v1',\n  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL,\n  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS manuscript_authors (\n  id TEXT PRIMARY KEY,\n  manuscript_id TEXT NOT NULL,\n  author_order INTEGER NOT NULL DEFAULT 0,\n  author_name TEXT NOT NULL,\n  author_email TEXT,\n  affiliation TEXT,\n  is_corresponding INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS manuscript_versions (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  manuscript_id TEXT,\n  manuscript_public_id TEXT,\n  article_id TEXT,\n  submission_id TEXT,\n  version_label TEXT NOT NULL,\n  version_number INTEGER NOT NULL,\n  title TEXT NOT NULL,\n  abstract TEXT,\n  topic TEXT,\n  keywords TEXT,\n  manuscript_json TEXT,\n  content_html TEXT,\n  pdf_r2_key TEXT,\n  html_r2_key TEXT,\n  license TEXT,\n  version_note TEXT,\n  change_note TEXT,\n  created_by_member_id INTEGER,\n  submitted_at TEXT,\n  accepted_at TEXT,\n  published_at TEXT,\n  content_fingerprint TEXT,\n  is_latest INTEGER DEFAULT 0,\n  self_published_revision INTEGER DEFAULT 0,\n  is_self_published_revision INTEGER DEFAULT 0,\n  moderation_status TEXT DEFAULT 'visible',\n  correction_window_hours INTEGER DEFAULT 12,\n  correction_window_closes_at TEXT,\n  grace_updated_at TEXT,\n  requires_revision_fee INTEGER DEFAULT 0,\n  revision_fee_paid_at TEXT,\n  revision_fee_paypal_order_id TEXT,\n  payment_required INTEGER DEFAULT 0,\n  payment_record_id INTEGER,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  FOREIGN KEY(created_by_member_id) REFERENCES members(id) ON DELETE SET NULL,\n  FOREIGN KEY(payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS manuscript_version_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  article_id TEXT,\n  manuscript_public_id TEXT,\n  version_label TEXT,\n  version_number INTEGER,\n  event_type TEXT NOT NULL,\n  event_note TEXT,\n  created_by TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS article_version_reports (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  article_id TEXT NOT NULL,\n  version_label TEXT,\n  title TEXT,\n  reporter_member_id INTEGER,\n  report_reason TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'new',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  reviewed_at TEXT,\n  admin_note TEXT,\n  FOREIGN KEY(reporter_member_id) REFERENCES members(id) ON DELETE SET NULL\n)", "CREATE TABLE IF NOT EXISTS peer_comments (\n  id TEXT PRIMARY KEY,\n  manuscript_id TEXT NOT NULL,\n  manuscript_public_id TEXT,\n  version_number INTEGER,\n  member_id TEXT NOT NULL,\n  member_email TEXT,\n  comment_html TEXT,\n  comment_text TEXT NOT NULL,\n  status TEXT NOT NULL DEFAULT 'visible',\n  is_deleted INTEGER NOT NULL DEFAULT 0,\n  deleted_by_admin TEXT,\n  deleted_at TEXT,\n  delete_reason TEXT,\n  report_count INTEGER DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at TEXT\n)", "CREATE TABLE IF NOT EXISTS comment_reports (\n  id TEXT PRIMARY KEY,\n  comment_id TEXT NOT NULL,\n  reporter_member_id TEXT,\n  reporter_email TEXT,\n  reason TEXT NOT NULL,\n  details TEXT,\n  status TEXT NOT NULL DEFAULT 'open',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  handled_at TEXT,\n  handled_by TEXT,\n  FOREIGN KEY (comment_id) REFERENCES peer_comments(id) ON DELETE CASCADE\n)", "CREATE TABLE IF NOT EXISTS article_reports (\n  id TEXT PRIMARY KEY,\n  manuscript_public_id TEXT NOT NULL,\n  version_number INTEGER,\n  reporter_member_id TEXT,\n  reporter_email TEXT,\n  reason TEXT NOT NULL,\n  details TEXT,\n  status TEXT NOT NULL DEFAULT 'open',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  handled_at TEXT,\n  handled_by TEXT\n)", "CREATE TABLE IF NOT EXISTS member_enforcement_events (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  enforcement_type TEXT,\n  event_type TEXT,\n  action TEXT,\n  reason TEXT,\n  created_by TEXT,\n  created_by_admin TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  restored_at TEXT,\n  restored_by TEXT\n)", "CREATE TABLE IF NOT EXISTS member_comment_enforcement_events (\n  id TEXT PRIMARY KEY,\n  member_id TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  reason TEXT,\n  created_by_admin TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS storage_objects (\n  id TEXT PRIMARY KEY,\n  owner_member_id TEXT,\n  related_submission_id TEXT,\n  related_article_id TEXT,\n  object_type TEXT NOT NULL,\n  r2_bucket TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',\n  r2_key TEXT NOT NULL,\n  mime_type TEXT,\n  size_bytes INTEGER,\n  sha256 TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS app_files (\n  id TEXT PRIMARY KEY,\n  owner_type TEXT NOT NULL,\n  owner_id TEXT NOT NULL,\n  file_role TEXT NOT NULL,\n  filename TEXT,\n  mime_type TEXT,\n  size_bytes INTEGER,\n  r2_key TEXT NOT NULL,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  deleted_at TEXT\n)", "CREATE TABLE IF NOT EXISTS r2_object_registry (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  r2_key TEXT UNIQUE,\n  object_key TEXT UNIQUE,\n  bucket_name TEXT NOT NULL DEFAULT 'aibiotrxiv-user-content',\n  owner_type TEXT,\n  owner_id TEXT,\n  object_role TEXT,\n  version_label TEXT,\n  sha256 TEXT,\n  mime_type TEXT,\n  size_bytes INTEGER,\n  immutable INTEGER NOT NULL DEFAULT 1,\n  retention_until TEXT,\n  status TEXT NOT NULL DEFAULT 'active',\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  deleted_at TEXT\n)", "CREATE TABLE IF NOT EXISTS security_audit_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  event_type TEXT,\n  actor TEXT,\n  actor_type TEXT,\n  actor_id TEXT,\n  action TEXT,\n  target_type TEXT,\n  target_id TEXT,\n  event_json TEXT,\n  details_json TEXT,\n  ip_address TEXT,\n  user_agent TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS security_rate_limits (\n  id TEXT PRIMARY KEY,\n  key TEXT,\n  rate_key TEXT,\n  route TEXT,\n  window_start INTEGER NOT NULL,\n  count INTEGER NOT NULL DEFAULT 0,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE TABLE IF NOT EXISTS purge_requests (\n  id TEXT PRIMARY KEY,\n  target_type TEXT NOT NULL,\n  target_id TEXT NOT NULL,\n  requested_by TEXT,\n  reason TEXT,\n  status TEXT NOT NULL DEFAULT 'pending',\n  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  created_at TEXT DEFAULT CURRENT_TIMESTAMP,\n  resolved_at TEXT,\n  completed_at TEXT,\n  completed_by TEXT,\n  event_json TEXT\n)", "CREATE TABLE IF NOT EXISTS admin_delete_events (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  target_type TEXT NOT NULL,\n  target_id TEXT NOT NULL,\n  previous_status TEXT,\n  next_status TEXT,\n  delete_action TEXT,\n  admin_account TEXT,\n  reason TEXT,\n  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n)", "CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)", "CREATE INDEX IF NOT EXISTS idx_members_status ON members(status)", "CREATE INDEX IF NOT EXISTS idx_email_tokens_member ON email_verification_tokens(member_id)", "CREATE INDEX IF NOT EXISTS idx_email_tokens_hash ON email_verification_tokens(token_hash)", "CREATE INDEX IF NOT EXISTS idx_member_sessions_hash ON member_sessions(session_token_hash)", "CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email)", "CREATE INDEX IF NOT EXISTS idx_member_manuscripts_member ON member_manuscripts(member_email)", "CREATE INDEX IF NOT EXISTS idx_member_manuscripts_status ON member_manuscripts(review_status,payment_status)", "CREATE INDEX IF NOT EXISTS idx_member_manuscripts_article ON member_manuscripts(article_id,version_number)", "CREATE INDEX IF NOT EXISTS idx_payment_records_submission ON payment_records(submission_id)", "CREATE INDEX IF NOT EXISTS idx_payment_records_order ON payment_records(provider_order_id)", "CREATE INDEX IF NOT EXISTS idx_payment_waivers_email ON payment_waivers(member_email)", "CREATE INDEX IF NOT EXISTS idx_manuscripts_slug ON manuscripts(slug)", "CREATE INDEX IF NOT EXISTS idx_manuscripts_public_id ON manuscripts(public_id)", "CREATE INDEX IF NOT EXISTS idx_manuscript_versions_article ON manuscript_versions(article_id, version_number)", "CREATE INDEX IF NOT EXISTS idx_manuscript_versions_latest ON manuscript_versions(article_id, is_latest)", "CREATE INDEX IF NOT EXISTS idx_peer_comments_article ON peer_comments(manuscript_id)", "CREATE INDEX IF NOT EXISTS idx_peer_comments_member ON peer_comments(member_id)", "CREATE INDEX IF NOT EXISTS idx_app_files_owner ON app_files(owner_type, owner_id)", "CREATE INDEX IF NOT EXISTS idx_r2_registry_key ON r2_object_registry(r2_key)", "CREATE INDEX IF NOT EXISTS idx_r2_registry_object_key ON r2_object_registry(object_key)", "CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_events(action)", "CREATE INDEX IF NOT EXISTS idx_security_audit_event_type ON security_audit_events(event_type)", "CREATE INDEX IF NOT EXISTS idx_security_rate_key ON security_rate_limits(key, window_start)", "INSERT OR IGNORE INTO schema_migrations (id, version, description, applied_at)\nVALUES ('mig_v55_compat_schema', 'v55_compat_schema', 'D1 schema compatible with v46 site plus D1/R2 diagnostics and initializer', CURRENT_TIMESTAMP)", "INSERT OR IGNORE INTO payment_waivers (id, member_email, reason, active, created_by, created_at)\nVALUES ('waiver_changyuraptor_dinosaur_gmail', 'changyuraptor.dinosaur@gmail.com', 'Owner testing account: bypass PayPal for workflow testing', 1, 'system', CURRENT_TIMESTAMP)", "INSERT OR IGNORE INTO app_settings (key, value, updated_at)\nVALUES\n  ('site_email', 'aibiotrxiv@gmail.com', CURRENT_TIMESTAMP),\n  ('payment_fee_usd', '5.00', CURRENT_TIMESTAMP),\n  ('version_free_limit', '15', CURRENT_TIMESTAMP),\n  ('version_edit_window_hours', '12', CURRENT_TIMESTAMP)"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

async function tableExists(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?")
    .bind(tableName)
    .first();
  return !!row;
}

async function countTables(db: D1Database): Promise<number> {
  const row: any = await db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type = 'table'")
    .first();
  return Number(row?.n || 0);
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret") || "";

  if (!env.DB) {
    return json({
      ok: false,
      error: "D1 binding DB is missing. Check Cloudflare Pages → Settings → Bindings."
    }, 500);
  }

  if (!env.INIT_DATABASE_SECRET) {
    return json({
      ok: false,
      error: "INIT_DATABASE_SECRET is not configured in Cloudflare Pages Variables and Secrets."
    }, 500);
  }

  if (providedSecret !== env.INIT_DATABASE_SECRET) {
    return json({
      ok: false,
      error: "Invalid initialization secret."
    }, 403);
  }

  const requiredTables = [
    "members",
    "email_verification_tokens",
    "member_sessions",
    "member_manuscripts",
    "payment_records",
    "manuscripts",
    "manuscript_versions",
    "peer_comments",
    "app_files",
    "r2_object_registry",
    "security_audit_events",
    "app_settings"
  ];

  try {
    const beforeCount = await countTables(env.DB);
    const executed: Array<{ index: number; preview: string }> = [];

    for (let i = 0; i < STATEMENTS.length; i++) {
      const statement = STATEMENTS[i].trim();
      if (!statement) continue;

      try {
        await env.DB.prepare(statement).run();
        executed.push({
          index: i + 1,
          preview: statement.slice(0, 120)
        });
      } catch (error: any) {
        return json({
          ok: false,
          error: String(error?.message || error),
          failedStatementIndex: i + 1,
          failedStatementPreview: statement.slice(0, 500),
          executedCount: executed.length
        }, 500);
      }
    }

    const after: Record<string, boolean> = {};
    for (const table of requiredTables) {
      after[table] = await tableExists(env.DB, table);
    }

    const missing = Object.entries(after)
      .filter(([, exists]) => !exists)
      .map(([table]) => table);

    return json({
      ok: missing.length === 0,
      message: missing.length === 0
        ? "AIBioTrXiv D1 schema initialized successfully."
        : "D1 schema ran, but some required tables are still missing.",
      statementCount: STATEMENTS.length,
      executedCount: executed.length,
      beforeTableCount: beforeCount,
      after,
      missing
    }, missing.length === 0 ? 200 : 500);
  } catch (error: any) {
    return json({
      ok: false,
      error: String(error?.message || error),
      stack: error?.stack || null
    }, 500);
  }
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  return onRequestGet(context);
}
