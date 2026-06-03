export interface Env {
  ADMIN_ACCOUNT?: string;
  ADMIN_PASSWORD_1?: string;
  ADMIN_PASSWORD_2?: string;
  ADMIN_SESSION_SECRET?: string;
}

const COOKIE_NAME = 'aibio_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlEncodeText(text: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlDecodeText(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function createAdminToken(env: Env, account: string): Promise<string> {
  if (!env.ADMIN_SESSION_SECRET) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const payload = {
    account,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const body = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await hmac(env.ADMIN_SESSION_SECRET, body);
  return `${body}.${signature}`;
}

export async function verifyAdminToken(env: Env, token?: string | null): Promise<{ ok: boolean; account?: string; reason?: string }> {
  if (!token) return { ok: false, reason: 'No admin session cookie.' };
  if (!env.ADMIN_SESSION_SECRET) return { ok: false, reason: 'ADMIN_SESSION_SECRET is not configured.' };
  const [body, signature] = token.split('.');
  if (!body || !signature) return { ok: false, reason: 'Invalid token format.' };
  const expected = await hmac(env.ADMIN_SESSION_SECRET, body);
  if (!timingSafeEqual(signature, expected)) return { ok: false, reason: 'Invalid token signature.' };
  try {
    const payload = JSON.parse(base64UrlDecodeText(body));
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
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
