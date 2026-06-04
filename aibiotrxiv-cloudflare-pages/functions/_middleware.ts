// AIBioTrXiv security middleware for Cloudflare Pages Functions.
// This layer adds security headers and blocks cross-site state-changing API calls.
// It is not a substitute for Cloudflare WAF, Access, D1 Time Travel, R2 bucket locks,
// or account-level 2FA, but it gives every API response a safer baseline.

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=() ',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com https://www.google.com https://challenges.cloudflare.com",
    "connect-src 'self' https://api-m.paypal.com https://api-m.sandbox.paypal.com https://api.resend.com",
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://challenges.cloudflare.com",
    "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com"
  ].join('; ')
};

function sameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function onRequest(context: any) {
  const { request, next } = context;
  if (!sameOrigin(request)) {
    return new Response(JSON.stringify({ ok: false, error: 'Cross-site state-changing requests are blocked.' }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS }
    });
  }

  const response = await next();
  const secured = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) secured.headers.set(k, v);
  return secured;
}
