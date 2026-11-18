CREATE TABLE IF NOT EXISTS admin_order_push_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, admin_user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth_secret TEXT NOT NULL,
  first_event_after INTEGER NOT NULL, last_test_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS admin_order_push_devices_owner ON admin_order_push_devices(admin_user_id);
CREATE TABLE IF NOT EXISTS admin_order_push_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS admin_order_push_events_date ON admin_order_push_events(created_at);
CREATE TABLE IF NOT EXISTS admin_order_push_deliveries (
  event_id INTEGER NOT NULL, device_id INTEGER NOT NULL, attempts INTEGER NOT NULL,
  next_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, device_id)
);
CREATE TRIGGER IF NOT EXISTS admin_order_push_on_paid_insert
AFTER INSERT ON orders WHEN NEW.payment_status = 'PAID'
BEGIN
  INSERT OR IGNORE INTO admin_order_push_events (order_id) VALUES (NEW.id);
END;
CREATE TRIGGER IF NOT EXISTS admin_order_push_on_paid_update
AFTER UPDATE OF status, payment_status ON orders
WHEN NEW.payment_status = 'PAID' AND NEW.status <> 'PENDING_PAYMENT'
  AND (OLD.payment_status <> 'PAID' OR OLD.status = 'PENDING_PAYMENT')
BEGIN
  INSERT OR IGNORE INTO admin_order_push_events (order_id) VALUES (NEW.id);
END;
