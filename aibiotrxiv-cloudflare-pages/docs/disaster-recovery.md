# AIBioTrXiv Disaster Recovery Plan

## If D1 data is damaged
1. Stop accepting new submissions temporarily.
2. Record the suspected attack / bug time.
3. Use Cloudflare D1 Time Travel to restore to the latest known-good time.
4. Export audit logs before and after restore if possible.
5. Reconcile PayPal records against `payment_records` and PayPal dashboard.
6. Reconcile R2 object registry against R2 bucket contents.

## If R2 files are deleted or modified
1. Check whether object is under bucket lock / retention.
2. Recover from backup prefix or retained object version if configured.
3. Use D1 `r2_object_registry` to identify expected object keys and checksums.
4. Do not repoint article metadata until the restored object is verified.

## If admin account is suspected compromised
1. Rotate `ADMIN_PASSWORD_1`.
2. Rotate `ADMIN_PASSWORD_2`.
3. Rotate `ADMIN_SESSION_SECRET` to invalidate sessions.
4. Review `security_audit_events` and `admin_delete_events`.
5. Verify D1 and R2 integrity.
6. Review Cloudflare Access logs.

## If PayPal abuse is suspected
1. Compare D1 `paypal_verification_events` and `payment_records` against PayPal dashboard.
2. Reject any record without verified PayPal order ID and completed capture.
3. Rotate `PAYPAL_CLIENT_SECRET` if exposed.

## Restore priority
1. Member accounts and email verification.
2. Payment records.
3. Published article metadata and versions.
4. Published PDF / HTML / figures in R2.
5. Peer comments and reports.
6. Drafts.
