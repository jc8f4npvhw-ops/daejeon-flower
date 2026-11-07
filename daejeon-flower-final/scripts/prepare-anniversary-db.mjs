import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const detailColumns={relationship:'TEXT',occasion:'TEXT',memo:"TEXT NOT NULL DEFAULT ''",start_date:'TEXT'};
export function preparationSql(existingColumns=[]) {
  const sql=['0007_anniversary_reminders.sql','0008_anniversary_coupons.sql','0009_payment_anniversary_access.sql']
    .map(name=>readFileSync(join(root,'migrations',name),'utf8')).join('\n');
  return sql+'\n'+Object.entries(detailColumns).filter(([name])=>!existingColumns.includes(name))
    .map(([name,type])=>'ALTER TABLE anniversary_reminders ADD COLUMN '+name+' '+type+';').join('\n');
}
function execute(args) {
  const result=spawnSync(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','daejeon-flower-db','--remote','--json',...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:300000});
  if(result.error||result.status!==0) throw new Error(result.stderr||result.stdout||String(result.error));
  let data;try {data=JSON.parse(result.stdout)} catch {throw new Error('Cloudflare returned an unreadable result. No further changes were attempted.')}
  if(!Array.isArray(data)||data.some(item=>item.success!==true)) throw new Error('Database command failed. Stop before publishing.');
  return data.flatMap(item=>item.results||[]);
}
export function main() {
  const tables=execute(['--command',"SELECT name FROM sqlite_master WHERE type='table'"]);
  if(!['customers','orders'].every(name=>tables.some(row=>row.name===name))) throw new Error('Existing shop database was not found. Stop before publishing.');
  const columns=execute(['--command','PRAGMA table_info(anniversary_reminders)']).map(row=>row.name);
  const temporary=mkdtempSync(join(tmpdir(),'dfds-db-'));
  try {
    const file=join(temporary,'anniversary.sql');
    writeFileSync(file,preparationSql(columns),'utf8');
    console.log('Adding anniversary tables and missing fields. Existing customer/order records are retained.');
    execute(['--file',file,'--yes']);
    const after=execute(['--command','PRAGMA table_info(anniversary_reminders)']).map(row=>row.name);
    const names=execute(['--command',"SELECT name FROM sqlite_master WHERE type='table'"]).map(row=>row.name);
    if(!Object.keys(detailColumns).every(name=>after.includes(name))||!['anniversary_coupons','anniversary_coupon_redemptions','anniversary_payment_access','anniversary_reminder_starts'].every(name=>names.includes(name))) throw new Error('Schema verification failed. Stop before publishing.');
    console.log('Database preparation completed. Commit and Push the release files next. Automatic sending/payment switches were not changed.');
  } finally {rmSync(temporary,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {main()} catch(error) {console.error(error.message);process.exitCode=1}
}
