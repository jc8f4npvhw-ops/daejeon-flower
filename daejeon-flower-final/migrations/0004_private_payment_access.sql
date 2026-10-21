-- Additive migration; no existing data is replaced.
CREATE TABLE IF NOT EXISTS private_payment_credentials (
 entry_id TEXT PRIMARY KEY,
 password_hash TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
