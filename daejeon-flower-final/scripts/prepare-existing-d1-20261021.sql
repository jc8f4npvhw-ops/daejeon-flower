-- Prepared against the user-provided 2026-10-21 D1 schema.
-- Structure only: no customer/order/product/settings values changed.
-- Not applied remotely. Existing DB: daejeon-flower-db.
-- Do not substitute the original base SQL or re-run seed data.

CREATE TABLE IF NOT EXISTS admin_activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 admin_user_id INTEGER,
 action TEXT NOT NULL,
 target_type TEXT NOT NULL,
 target_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(admin_user_id) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS checkout_requests(idempotency_key TEXT PRIMARY KEY,request_hash TEXT NOT NULL,order_no TEXT NOT NULL UNIQUE,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS content_revisions(revision INTEGER PRIMARY KEY,content_json TEXT NOT NULL,changed_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(changed_by) REFERENCES admin_users(id));

CREATE TABLE IF NOT EXISTS customer_admin_notes (
 customer_id INTEGER PRIMARY KEY,
 note TEXT NOT NULL DEFAULT '',
 updated_by INTEGER,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
 FOREIGN KEY(updated_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS delivery_quotes(id TEXT PRIMARY KEY,request_hash TEXT NOT NULL,idempotency_key TEXT UNIQUE NOT NULL,payload_json TEXT NOT NULL,fee_krw INTEGER,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','CHECKOUT','EXPIRED')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS order_alert_acknowledgements (
 order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 acknowledged_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
 acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_versions(order_id INTEGER PRIMARY KEY,version INTEGER NOT NULL DEFAULT 0,operation_token TEXT,lock_expires_at TEXT,FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS private_payment_credentials (
 entry_id TEXT PRIMARY KEY,
 password_hash TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_login_attempts(attempt_key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,reset_at TEXT NOT NULL);

CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_order_alert_candidates ON orders(created_at,id)
WHERE payment_status IN ('PAID','PARTIAL_REFUND') AND status IN ('NEW','IN_PRODUCTION');

CREATE INDEX IF NOT EXISTS idx_quotes_status ON delivery_quotes(status,created_at);
