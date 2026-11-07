import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {preparationSql,parseWranglerResult,wranglerArgs} from '../scripts/prepare-anniversary-db.mjs';

test('Wrangler query and file-import progress outputs parse without hiding command errors',()=>{
 const response=JSON.stringify([{success:true,results:[{name:'orders'}]}],null,2);
 assert.deepEqual(parseWranglerResult(response),[{name:'orders'}]);
 assert.deepEqual(parseWranglerResult('\uFEFF'+response),[{name:'orders'}]);
 assert.deepEqual(parseWranglerResult('\u001b[32mChecking if file needs uploading\u001b[0m\n[progress]\nUploading complete.\r\n'+response),[{name:'orders'}]);
 assert.throws(()=>parseWranglerResult(JSON.stringify([{success:false,results:[]}])),/failed/);
 assert.throws(()=>parseWranglerResult('[]'),/failed/);
 assert.throws(()=>parseWranglerResult('Upload complete, but no JSON result.'),/may already have applied/);
 assert.throws(()=>parseWranglerResult(response+'\ntruncated result'),/may already have applied/);
});

test('release DB preparation preserves records, works repeatedly, and preserves active settings',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE customers(id INTEGER PRIMARY KEY,name TEXT); CREATE TABLE orders(id INTEGER PRIMARY KEY); INSERT INTO customers VALUES(1,'기존 고객'); INSERT INTO orders VALUES(9);");
 db.exec(preparationSql());
 db.exec("INSERT INTO anniversary_reminders(id,customer_id,label,month,day,memo) VALUES('existing',1,'생일',1,2,'기존 메모'); UPDATE anniversary_coupon_settings SET enabled=1;");
 const columns=()=>db.prepare('PRAGMA table_info(anniversary_reminders)').all().map((row:any)=>row.name);
 db.exec(preparationSql(columns()));
 assert.equal(db.prepare('SELECT name FROM customers').get()?.name,'기존 고객');
 assert.equal(db.prepare('SELECT id FROM orders').get()?.id,9);
 assert.equal(db.prepare('SELECT memo FROM anniversary_reminders').get()?.memo,'기존 메모');
 assert.equal(db.prepare('SELECT enabled FROM anniversary_coupon_settings').get()?.enabled,1);
 db.close();
});
test('partially added detail columns are completed without duplicate-column failures',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE customers(id INTEGER PRIMARY KEY); CREATE TABLE orders(id INTEGER PRIMARY KEY);');
 const sql=preparationSql();
 db.exec(sql.slice(0,sql.indexOf('ALTER TABLE anniversary_reminders ADD COLUMN occasion')));
 const columns=db.prepare('PRAGMA table_info(anniversary_reminders)').all().map((row:any)=>row.name);
 db.exec(preparationSql(columns));
 assert.deepEqual(db.prepare('PRAGMA table_info(anniversary_reminders)').all().slice(-4).map((row:any)=>row.name),['relationship','occasion','memo','start_date']);
 db.close();
});

test('schema SQL stays in a file, never in a CLI argument interpreted as an option',()=>{
 const args=wranglerArgs(['--file','C:\\Users\\user\\AppData\\Local\\Temp\\anniversary.sql','--yes']);
 assert.equal(args.includes('--command'),false);
 assert.equal(args[args.indexOf('--file')+1],'C:\\Users\\user\\AppData\\Local\\Temp\\anniversary.sql');
 assert.equal(args.some(value=>value.includes('-- Additive only')),false);
});
