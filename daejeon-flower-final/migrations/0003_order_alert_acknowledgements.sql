-- Additive only: no changes to existing order/payment tables.
CREATE TABLE IF NOT EXISTS order_alert_acknowledgements (
 order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 acknowledged_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
 acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_alert_candidates ON orders(created_at,id)
WHERE payment_status IN ('PAID','PARTIAL_REFUND') AND status IN ('NEW','IN_PRODUCTION');
