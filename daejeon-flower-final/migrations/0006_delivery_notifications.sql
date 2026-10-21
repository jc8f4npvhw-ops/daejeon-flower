-- Additive: retain existing orders, media, notifications and customer records.
CREATE TABLE IF NOT EXISTS delivery_photo_access (
 order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 nonce TEXT NOT NULL,
 token_hash TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS delivery_notification_outbox (
 id TEXT PRIMARY KEY,
 event_key TEXT NOT NULL UNIQUE,
 order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 recipient_phone TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','WAITING_SETUP','SENDING','ACCEPTED','SENT','FAILED','UNKNOWN','CANCELLED')),
 attempts INTEGER NOT NULL DEFAULT 0,
 provider_group_id TEXT,
 provider_message_id TEXT,
 failure_code TEXT,
 expires_at TEXT NOT NULL DEFAULT (datetime('now','+7 days')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_delivery_outbox_status ON delivery_notification_outbox(status,updated_at);
