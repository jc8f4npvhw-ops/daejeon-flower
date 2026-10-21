-- 기존 D1 FINAL v2 위에 한 번 추가 적용합니다. 기존 테이블·데이터를 삭제하지 않습니다.
CREATE TABLE IF NOT EXISTS security_login_attempts(attempt_key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,reset_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content_revisions(revision INTEGER PRIMARY KEY,content_json TEXT NOT NULL,changed_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(changed_by) REFERENCES admin_users(id));
CREATE TABLE IF NOT EXISTS checkout_requests(idempotency_key TEXT PRIMARY KEY,request_hash TEXT NOT NULL,order_no TEXT NOT NULL UNIQUE,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS delivery_quotes(id TEXT PRIMARY KEY,request_hash TEXT NOT NULL,idempotency_key TEXT UNIQUE NOT NULL,payload_json TEXT NOT NULL,fee_krw INTEGER,token_hash TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','CHECKOUT','EXPIRED')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_versions(order_id INTEGER PRIMARY KEY,version INTEGER NOT NULL DEFAULT 0,operation_token TEXT,lock_expires_at TEXT,FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON delivery_quotes(status,created_at);
-- Wreath ordering is available; never restore CEREMONY to COMING_SOON.
UPDATE categories SET sales_mode='COMING_SOON',updated_at=CURRENT_TIMESTAMP WHERE code='WEDDING';
UPDATE categories SET sales_mode='CONSULT',updated_at=CURRENT_TIMESTAMP WHERE code='PROPOSE_TRUNK';
UPDATE products SET sales_mode='CONSULT',updated_at=CURRENT_TIMESTAMP WHERE code='TRUNK_PROPOSAL';
UPDATE occasion_recommendations SET variant_id=NULL,preset_json=NULL WHERE product_id=(SELECT id FROM products WHERE code='TRUNK_PROPOSAL');
