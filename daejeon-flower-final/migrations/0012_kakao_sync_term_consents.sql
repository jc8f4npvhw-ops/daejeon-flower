CREATE TABLE IF NOT EXISTS kakao_member_term_consents (
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  agreed_at TEXT NOT NULL,
  PRIMARY KEY(customer_id, tag)
);
