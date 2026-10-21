import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

test('existing D1 structure upgrade preserves all business rows and can be applied twice', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('./existing-D1-FINAL.sql', import.meta.url), 'utf8'));
  db.prepare('INSERT INTO customers(name,phone_normalized) VALUES(?,?)').run('보존 확인', '01000000000');
  const names = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => String(r.name));
  const snapshots = names.map(name => ({ name, rows: db.prepare(`SELECT * FROM "${name}"`).all(), columns: db.prepare(`PRAGMA table_info("${name}")`).all() }));
  const sql = fs.readFileSync(new URL('../scripts/prepare-existing-d1-20261021.sql', import.meta.url), 'utf8');
  db.exec(sql);
  db.exec(sql);
  for (const { name, rows, columns } of snapshots) {
    assert.deepEqual(db.prepare(`SELECT * FROM "${name}"`).all(), rows, `${name}: row values preserved`);
    assert.deepEqual(db.prepare(`PRAGMA table_info("${name}")`).all(), columns, `${name}: existing columns preserved`);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").get()!.n, 40);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
});

test('combined preparation includes delivery tables without changing existing customer or catalog data', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('./existing-D1-FINAL.sql', import.meta.url), 'utf8'));
  const before = db.prepare('SELECT * FROM categories ORDER BY id').all();
  const sql = fs.readFileSync(new URL('../scripts/prepare-current-d1-20261021.sql', import.meta.url), 'utf8');
  db.exec(sql); db.exec(sql);
  assert.deepEqual(db.prepare('SELECT * FROM categories ORDER BY id').all(), before);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").get()!.n, 42);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.close();
});
