
export interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_APP_SECRET?: string;
  MEMBER_SESSION_SECRET?: string;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function redirect(url: string, headers: Record<string,string> = {}) {
  return new Response(null, { status: 302, headers: { location: url, ...headers } });
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const part = cookie.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : "";
}

export function cookie(name: string, value: string, opts: string) {
  return `${name}=${encodeURIComponent(value)}; ${opts}`;
}

export function baseUrl(request: Request) {
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export async function ensureOAuthTables(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS member_oauth_accounts (
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
  )`).run();

  // Existing older D1 tables may not have these columns. Ignore duplicate-column errors.
  const alters = [
    "ALTER TABLE members ADD COLUMN auth_provider TEXT",
    "ALTER TABLE members ADD COLUMN provider_user_id TEXT",
    "ALTER TABLE members ADD COLUMN avatar_url TEXT"
  ];
  for (const sql of alters) {
    try { await db.prepare(sql).run(); } catch (_) {}
  }
}

export async function upsertOAuthMember(env: Env, provider: string, providerUserId: string, email: string, displayName: string, avatarUrl = "") {
  if (!env.DB) throw new Error("D1 binding DB is missing.");
  await ensureOAuthTables(env.DB);

  email = String(email || "").trim().toLowerCase();
  displayName = String(displayName || email || "AIBioTrXiv member").trim();
  if (!email) throw new Error("The OAuth provider did not return an email address.");

  let member: any = await env.DB.prepare("SELECT * FROM members WHERE email = ?").bind(email).first();

  if (!member) {
    const result: any = await env.DB.prepare(`
      INSERT INTO members
        (name, display_name, email, password_hash, password_salt, status, account_status, email_verified, verified_at, auth_provider, provider_user_id, avatar_url, created_at, updated_at, last_login_at)
      VALUES
        (?, ?, ?, 'oauth-login', NULL, 'active', 'active', 1, CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(displayName, displayName, email, provider, providerUserId, avatarUrl).run();

    const id = result?.meta?.last_row_id;
    member = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(id).first();
  } else {
    await env.DB.prepare(`
      UPDATE members
      SET name = COALESCE(NULLIF(?, ''), name),
          display_name = COALESCE(NULLIF(?, ''), display_name),
          email_verified = 1,
          verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
          auth_provider = ?,
          provider_user_id = ?,
          avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
          updated_at = CURRENT_TIMESTAMP,
          last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(displayName, displayName, provider, providerUserId, avatarUrl, member.id).run();
    member = await env.DB.prepare("SELECT * FROM members WHERE id = ?").bind(member.id).first();
  }

  await env.DB.prepare(`
    INSERT INTO member_oauth_accounts
      (id, member_id, provider, provider_user_id, provider_email, provider_display_name, provider_avatar_url, created_at, last_login_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(provider, provider_user_id) DO UPDATE SET
      provider_email = excluded.provider_email,
      provider_display_name = excluded.provider_display_name,
      provider_avatar_url = excluded.provider_avatar_url,
      last_login_at = CURRENT_TIMESTAMP
  `).bind(crypto.randomUUID(), member.id, provider, providerUserId, email, displayName, avatarUrl).run();

  return member;
}

export async function createMemberSession(env: Env, request: Request, member: any, provider: string) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const hash = await sha256(token);
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO member_sessions (id, member_id, session_token_hash, expires_at, created_at, last_seen_at, ip_address, user_agent)
    VALUES (?, ?, ?, datetime('now', '+30 days'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
  `).bind(sessionId, member.id, hash, request.headers.get("cf-connecting-ip") || "", request.headers.get("user-agent") || "").run();

  const secure = "Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000";
  const readable = "Path=/; Secure; SameSite=Lax; Max-Age=2592000";
  const headers = new Headers();
  headers.append("Set-Cookie", cookie("aibio_member_session", token, secure));
  headers.append("Set-Cookie", cookie("aibio_member_email", member.email, readable));
  headers.append("Set-Cookie", cookie("aibio_member_name", member.display_name || member.name || member.email, readable));
  headers.append("Set-Cookie", cookie("aibio_member_provider", provider, readable));
  return headers;
}
