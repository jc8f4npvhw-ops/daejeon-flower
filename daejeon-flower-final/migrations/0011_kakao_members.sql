-- Additive only. No automatic merge by a typed name/phone.
CREATE TABLE IF NOT EXISTS kakao_login_states(state_hash TEXT PRIMARY KEY,expires_at TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS kakao_signup_sessions(token_hash TEXT PRIMARY KEY,kakao_id TEXT NOT NULL,claims_json TEXT NOT NULL,expires_at TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS kakao_members(kakao_id TEXT PRIMARY KEY,customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id),contact_phone TEXT,birthday TEXT,phone_verified INTEGER NOT NULL DEFAULT 0,terms_version TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS customer_login_sessions(token_hash TEXT PRIMARY KEY,customer_id INTEGER NOT NULL REFERENCES customers(id),expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kakao_feature_states(state_hash TEXT PRIMARY KEY,customer_id INTEGER NOT NULL,feature TEXT NOT NULL,expires_at TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS kakao_feature_tokens(customer_id INTEGER NOT NULL,feature TEXT NOT NULL,ciphertext TEXT NOT NULL,expires_at TEXT NOT NULL,PRIMARY KEY(customer_id,feature));
CREATE TABLE IF NOT EXISTS kakao_feature_actions(customer_id INTEGER NOT NULL,action_key TEXT NOT NULL,feature TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'UNKNOWN',result_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(customer_id,action_key));
