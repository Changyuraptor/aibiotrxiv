-- v49 persistence migration for existing databases. Safe additive tables only.
-- If your database was created fresh from schema.sql, you do not need this file.
CREATE TABLE IF NOT EXISTS app_files (id TEXT PRIMARY KEY, owner_email TEXT, related_id TEXT, r2_key TEXT NOT NULL, mime_type TEXT, size_bytes INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_member ON member_manuscripts(member_email);
CREATE INDEX IF NOT EXISTS idx_member_manuscripts_status ON member_manuscripts(review_status,payment_status);
CREATE INDEX IF NOT EXISTS idx_peer_comments_manuscript ON peer_comments(manuscript_id,status,created_at);
