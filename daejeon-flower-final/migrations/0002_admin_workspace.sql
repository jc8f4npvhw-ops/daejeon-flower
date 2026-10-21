-- Additive only: existing customer/order/media rows remain intact.
CREATE TABLE IF NOT EXISTS customer_admin_notes (
 customer_id INTEGER PRIMARY KEY,
 note TEXT NOT NULL DEFAULT '',
 updated_by INTEGER,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
 FOREIGN KEY(updated_by) REFERENCES admin_users(id)
);
CREATE TABLE IF NOT EXISTS admin_activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 admin_user_id INTEGER,
 action TEXT NOT NULL,
 target_type TEXT NOT NULL,
 target_id TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(admin_user_id) REFERENCES admin_users(id)
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity(created_at);
