interface PaymentNotificationPayload {
  to?: string;
  submissionId?: string;
  title?: string;
  memberEmail?: string;
  memberName?: string;
  paypalOrderId?: string;
  amountUsd?: string;
  paymentStatus?: string;
  reviewStatus?: string;
  submittedAt?: string;
  paymentPurpose?: 'first_submission' | 'revision_fee' | string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function paypalBase(env: any) {
  if (env.PAYPAL_API_BASE) return String(env.PAYPAL_API_BASE).replace(/\/$/, '');
  return String(env.PAYPAL_MODE || '').toLowerCase() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getPayPalAccessToken(env: any) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured as Cloudflare Pages secrets for automatic payment verification.');
  }
  const creds = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal access-token request failed: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data.access_token as string;
}

function extractCompletedCapture(order: any) {
  const units = Array.isArray(order?.purchase_units) ? order.purchase_units : [];
  for (const unit of units) {
    const captures = Array.isArray(unit?.payments?.captures) ? unit.payments.captures : [];
    for (const capture of captures) {
      if (String(capture?.status || '').toUpperCase() === 'COMPLETED') return capture;
    }
  }
  return null;
}

async function verifyPayPalOrder(env: any, orderId: string, expectedAmount = '5.00') {
  if (!orderId || orderId === 'prototype-paid' || orderId === 'payment-waived-test-account') {
    throw new Error('A real PayPal order ID is required for automatic payment verification.');
  }
  const token = await getPayPalAccessToken(env);
  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const order: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PayPal order lookup failed: ${res.status} ${JSON.stringify(order).slice(0, 300)}`);
  }

  const capture = extractCompletedCapture(order);
  const orderStatus = String(order?.status || '').toUpperCase();
  const amount = capture?.amount || order?.purchase_units?.[0]?.amount || {};
  const value = String(amount.value || '');
  const currency = String(amount.currency_code || '').toUpperCase();
  const expected = Number(expectedAmount).toFixed(2);
  const actual = Number(value).toFixed(2);

  if (orderStatus !== 'COMPLETED' && !capture) {
    throw new Error(`PayPal order is not completed. Current status: ${orderStatus || 'unknown'}`);
  }
  if (currency !== 'USD') {
    throw new Error(`PayPal payment currency mismatch. Expected USD, got ${currency || 'unknown'}.`);
  }
  if (actual !== expected) {
    throw new Error(`PayPal payment amount mismatch. Expected US$${expected}, got US$${actual}.`);
  }

  return {
    verified: true,
    orderId,
    orderStatus,
    captureId: capture?.id || null,
    captureStatus: capture?.status || null,
    amountUsd: actual,
    payerEmail: order?.payer?.email_address || null,
    raw: order
  };
}

async function writePaymentToD1(env: any, payload: PaymentNotificationPayload, verification: any, emailSent = false, emailProvider = '') {
  if (!env.DB || !payload.submissionId) return;
  const status = payload.paymentPurpose === 'revision_fee' ? 'paid_revision_fee' : 'paid';
  try {
    await env.DB.prepare(`UPDATE member_manuscripts
      SET payment_status = ?, paypal_order_id = ?, review_status = CASE WHEN review_status = 'revision_draft' THEN review_status ELSE 'under_review' END, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).bind(status, verification.orderId, payload.submissionId).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`UPDATE submissions
      SET payment_status = ?, paypal_order_id = ?, review_status = 'under_review', status = 'submitted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).bind(status, verification.orderId, payload.submissionId).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`INSERT INTO paypal_verification_events
      (submission_id, member_email, provider_order_id, provider_capture_id, amount_usd, currency, verification_status, payment_purpose, raw_response_json)
      VALUES (?, ?, ?, ?, ?, 'USD', 'verified', ?, ?)`)
      .bind(payload.submissionId, payload.memberEmail || '', verification.orderId, verification.captureId || '', verification.amountUsd || '5.00', payload.paymentPurpose || 'first_submission', JSON.stringify(verification.raw || {}))
      .run();
  } catch (_) {}
  try {
    await env.DB.prepare(`INSERT INTO payment_notification_events
      (submission_id, member_email, admin_email, provider_order_id, amount_usd, email_subject, email_sent, email_provider, raw_response_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(payload.submissionId, payload.memberEmail || '', env.ADMIN_PAYMENT_NOTIFICATION_EMAIL || 'aibiotrxiv@gmail.com', verification.orderId, verification.amountUsd || '5.00', `[AIBioTrXiv] Verified PayPal payment: ${payload.submissionId}`, emailSent ? 1 : 0, emailProvider, JSON.stringify(verification.raw || {}))
      .run();
  } catch (_) {}
}

export async function onRequestPost(context: any) {
  const env = context.env || {};
  let payload: PaymentNotificationPayload = {};
  try {
    payload = await context.request.json();
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  let verification: any;
  try {
    verification = await verifyPayPalOrder(env, String(payload.paypalOrderId || ''), payload.amountUsd || '5.00');
  } catch (err: any) {
    return json({ ok: false, verified: false, error: err?.message || 'PayPal verification failed.' }, 402);
  }

  const adminEmail = env.ADMIN_PAYMENT_NOTIFICATION_EMAIL || 'aibiotrxiv@gmail.com';
  const isRevisionFee = payload.paymentPurpose === 'revision_fee';
  const subject = isRevisionFee
    ? `[AIBioTrXiv] Verified US$5 revision-version fee: ${payload.submissionId || 'unknown submission'}`
    : `[AIBioTrXiv] Verified US$5 submission payment: ${payload.submissionId || 'unknown submission'}`;
  const body = [
    isRevisionFee
      ? 'AIBioTrXiv has verified a US$5 PayPal platform maintenance fee for a post-v15 version.'
      : 'AIBioTrXiv has verified a US$5 PayPal manuscript submission processing payment.',
    '',
    `Member account email: ${payload.memberEmail || '(unknown)'}`,
    `Member display name: ${payload.memberName || '(not provided)'}`,
    `Submission ID: ${payload.submissionId || '(unknown)'}`,
    `Manuscript title: ${payload.title || '(untitled)'}`,
    `PayPal order ID: ${verification.orderId}`,
    `PayPal capture ID: ${verification.captureId || '(not provided)'}`,
    `Amount verified: US$${verification.amountUsd}`,
    `Payment purpose: ${isRevisionFee ? 'post-v15 version maintenance fee' : 'first submission processing fee'}`,
    `Submitted at: ${payload.submittedAt || new Date().toISOString()}`,
    '',
    isRevisionFee
      ? 'This post-v15 version fee was verified. The author-side version workflow may publish the new version without editorial review.'
      : 'This manuscript may now be marked as paid and placed in the editorial review queue.'
  ].join('\n');

  let emailSent = false;
  let emailProvider = '';
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [adminEmail], subject, text: body })
    });
    const result = await res.text();
    if (!res.ok) return json({ ok: false, verified: true, emailSent: false, provider: 'resend', status: res.status, result }, 502);
    emailSent = true;
    emailProvider = 'resend';
  }

  await writePaymentToD1(env, payload, verification, emailSent, emailProvider);

  return json({
    ok: true,
    verified: true,
    emailSent,
    to: adminEmail,
    provider: emailProvider || 'not_configured',
    paypal: {
      orderId: verification.orderId,
      orderStatus: verification.orderStatus,
      captureId: verification.captureId,
      amountUsd: verification.amountUsd
    },
    message: emailSent ? 'Payment verified and notification email sent.' : body
  });
}
