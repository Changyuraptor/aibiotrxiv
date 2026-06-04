import { getCookie, verifyAdminToken, type Env as AdminEnv } from '../_session';

export interface Env extends AdminEnv {
  DB: D1Database;
  AIBIO_STORAGE: R2Bucket;
  ALLOW_FULL_STORAGE_RESET?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

const CONFIRMATION_TEXT = 'RESET AIBIOTRXIV';
const CONFIRMATION_SCOPE = 'D1_R2_FULL_RESET';

const RESET_TABLES = [
  // Child / event tables first.
  'comment_reports',
  'article_reports',
  'article_version_reports',
  'peer_comments',
  'manuscript_version_events',
  'manuscript_versions',
  'manuscript_authors',
  'manuscripts',
  'payment_notification_events',
  'paypal_verification_events',
  'payment_records',
  'submission_audit_events',
  'submission_files',
  'submission_sections',
  'submissions',
  'member_manuscript_figures',
  'member_manuscript_sections',
  'member_manuscript_authors',
  'member_manuscripts',
  'member_oauth_accounts',
  'email_verification_tokens',
  'member_sessions',
  'password_reset_tokens',
  'member_comment_enforcement_events',
  'member_enforcement_events',
  'payment_waivers',
  'members',
  'storage_objects',
  'app_files',
  'r2_object_registry',
  'purge_requests',
  'admin_delete_events',
  'security_rate_limits',
  'security_audit_events',
  'app_kv_storage'
];

const INITIAL_APP_SETTINGS: Array<[string, string]> = [
  ['site_email', 'aibiotrxiv@gmail.com'],
  ['payment_fee_usd', '5.00'],
  ['version_free_limit', '15'],
  ['version_edit_window_hours', '12'],
  ['member_auth_mode', 'oauth_only']
];

function readResetToggle(env: Env) {
  const candidates = [
    ['ALLOW_FULL_STORAGE_RESET', (env as any).ALLOW_FULL_STORAGE_RESET],
    ['AIBIO_ALLOW_FULL_STORAGE_RESET', (env as any).AIBIO_ALLOW_FULL_STORAGE_RESET],
    ['TEST_ALLOW_FULL_STORAGE_RESET', (env as any).TEST_ALLOW_FULL_STORAGE_RESET]
  ];
  const details = candidates.map(([name, value]) => {
    const present = value !== undefined && value !== null;
    const raw = present ? String(value) : '';
    const normalized = raw.trim().toLowerCase();
    const enabled = ['true', '1', 'yes', 'y', 'on', 'enabled'].includes(normalized);
    return { name, present, type: typeof value, length: raw.length, normalized, enabled };
  });
  const matched = details.find(item => item.enabled) || details[0];
  return {
    enabled: details.some(item => item.enabled),
    matchedName: matched?.name || 'ALLOW_FULL_STORAGE_RESET',
    details
  };
}


async function tableExists(db: D1Database, table: string): Promise<boolean> {
  const row: any = await db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = ?").bind(table).first();
  return Boolean(row?.name);
}

async function deleteTable(db: D1Database, table: string) {
  if (!(await tableExists(db, table))) return { table, existed: false, deleted: 0 };
  const before: any = await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first().catch(() => ({ n: 0 }));
  await db.prepare(`DELETE FROM ${table}`).run();
  await db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').bind(table).run().catch(() => null);
  return { table, existed: true, deleted: Number(before?.n || 0) };
}

async function restoreInitialRows(db: D1Database) {
  const restored: string[] = [];
  if (await tableExists(db, 'app_settings')) {
    for (const [key, value] of INITIAL_APP_SETTINGS) {
      await db.prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)`).bind(key, value).run();
    }
    restored.push('app_settings');
  }
  if (await tableExists(db, 'payment_waivers')) {
    await db.prepare(`INSERT OR IGNORE INTO payment_waivers (id, member_email, reason, active, created_by, created_at)
      VALUES ('waiver_changyuraptor_dinosaur_gmail', 'changyuraptor.dinosaur@gmail.com', 'Owner testing account: bypass PayPal for workflow testing', 1, 'system', CURRENT_TIMESTAMP)`).run();
    restored.push('payment_waivers');
  }
  return restored;
}

async function deleteAllR2Objects(bucket: R2Bucket) {
  let cursor: string | undefined = undefined;
  let deleted = 0;
  let batches = 0;
  const sampleDeleted: string[] = [];
  do {
    const listed = await bucket.list({ cursor, limit: 1000 });
    const keys = listed.objects.map(obj => obj.key);
    for (let i = 0; i < keys.length; i += 100) {
      const chunk = keys.slice(i, i + 100);
      if (!chunk.length) continue;
      await bucket.delete(chunk);
      deleted += chunk.length;
      batches += 1;
      for (const key of chunk) {
        if (sampleDeleted.length < 20) sampleDeleted.push(key);
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return { deleted, batches, sampleDeleted };
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const auth = await verifyAdminToken(context.env, getCookie(context.request));
  if (!auth.ok) return json({ ok: false, error: auth.reason || 'Admin login is required.' }, 401);
  const toggle = readResetToggle(context.env);
  return json({
    ok: true,
    route: '/api/admin/reset-storage',
    enabled: toggle.enabled,
    requiredEnv: 'ALLOW_FULL_STORAGE_RESET=true',
    acceptedValues: ['true', '1', 'yes', 'on', 'enabled'],
    activeToggleName: toggle.enabled ? toggle.matchedName : null,
    diagnostics: {
      allowFullStorageReset: toggle.details[0],
      alternativeToggleNames: toggle.details.slice(1)
    },
    confirmationText: CONFIRMATION_TEXT,
    confirmationScope: CONFIRMATION_SCOPE
  });
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const auth = await verifyAdminToken(env, getCookie(request));
  if (!auth.ok) return json({ ok: false, error: auth.reason || 'Admin login is required.' }, 401);

  const toggle = readResetToggle(env);
  if (!toggle.enabled) {
    return json({
      ok: false,
      error: 'Full storage reset is disabled for this running deployment. Set Cloudflare Pages variable ALLOW_FULL_STORAGE_RESET=true only on the test deployment, then redeploy that same deployment environment.',
      diagnostics: {
        allowFullStorageReset: toggle.details[0],
        alternativeToggleNames: toggle.details.slice(1)
      }
    }, 403);
  }
  if (!env.DB) return json({ ok: false, error: 'D1 binding DB is missing.' }, 500);
  if (!env.AIBIO_STORAGE) return json({ ok: false, error: 'R2 binding AIBIO_STORAGE is missing.' }, 500);

  const body: any = await request.json().catch(() => ({}));
  if (body.scope !== CONFIRMATION_SCOPE || body.confirmationText !== CONFIRMATION_TEXT || body.confirmFinal !== true) {
    return json({
      ok: false,
      error: `Reset confirmation failed. Type exactly ${CONFIRMATION_TEXT} and confirm the final checkbox.`
    }, 400);
  }

  const startedAt = new Date().toISOString();
  const r2 = await deleteAllR2Objects(env.AIBIO_STORAGE);
  const d1Results = [];
  await env.DB.prepare('PRAGMA foreign_keys = OFF').run().catch(() => null);
  for (const table of RESET_TABLES) {
    d1Results.push(await deleteTable(env.DB, table));
  }
  await env.DB.prepare('PRAGMA foreign_keys = ON').run().catch(() => null);
  const restoredInitialRows = await restoreInitialRows(env.DB);

  return json({
    ok: true,
    warning: 'D1 operational data and R2 objects were reset for this environment.',
    startedAt,
    finishedAt: new Date().toISOString(),
    actor: auth.account || 'admin',
    d1: {
      tables: d1Results,
      totalDeletedRows: d1Results.reduce((sum, row) => sum + (row.deleted || 0), 0),
      restoredInitialRows
    },
    r2
  });
}
