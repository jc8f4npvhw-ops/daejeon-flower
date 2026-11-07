CREATE TABLE IF NOT EXISTS anniversary_payment_access(order_id INTEGER PRIMARY KEY REFERENCES orders(id),customer_id INTEGER NOT NULL REFERENCES customers(id),access_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS anniversary_reminder_starts(anniversary_id TEXT PRIMARY KEY REFERENCES anniversary_reminders(id),starts_on TEXT NOT NULL);
