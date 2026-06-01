export interface Env {
  ADMIN_ACCOUNT?: string;
  ADMIN_PASSWORD_1?: string;
  ADMIN_PASSWORD_2?: string;
  ADMIN_SESSION_SECRET?: string;
}

const COOKIE_NAME = 'aibio_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function b64url(bytes: ArrayBuffer): string {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlString(text: string): string {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  return decodeURIComponent(escape(atob(normalized)));
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return b64url(sig);
}

export async function createAdminToken(env: Env, account: string): Promise<string> {
  if (!env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const payload = {
    account,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const body = b64urlString(JSON.stringify(payload));
  const signature = await hmac(env.ADMIN_SESSION_SECRET, body);
  return `${body}.${signature}`;
}

export async function verifyAdminToken(env: Env, token?: string | null): Promise<{ ok: boolean; account?: string; reason?: string }> {
  if (!token) return { ok: false, reason: 'No admin session cookie.' };
  if (!env.ADMIN_SESSION_SECRET) return { ok: false, reason: 'ADMIN_SESSION_SECRET is not configured.' };
  const [body, signature] = token.split('.');
  if (!body || !signature) return { ok: false, reason: 'Invalid token format.' };
  const expected = await hmac(env.ADMIN_SESSION_SECRET, body);
  if (signature !== expected) return { ok: false, reason: 'Invalid token signature.' };
  try {
    const payload = JSON.parse(fromB64url(body));
    if (payload.role !== 'admin') return { ok: false, reason: 'Invalid role.' };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'Admin session expired.' };
    return { ok: true, account: payload.account };
  } catch {
    return { ok: false, reason: 'Invalid token payload.' };
  }
}

export function getCookie(request: Request, name = COOKIE_NAME): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const parts = cookie.split(';').map(v => v.trim());
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx > 0 && part.slice(0, idx) === name) return part.slice(idx + 1);
  }
  return null;
}

export function adminCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
