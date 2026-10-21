-- Read-only schema audit. Does not read customer/order values or modify any data.
-- Run in Cloudflare D1 Console for the existing daejeon-flower-db.
SELECT name, sql
FROM sqlite_schema
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;
