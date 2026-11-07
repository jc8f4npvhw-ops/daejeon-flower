import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const detailColumns={relationship:'TEXT',occasion:'TEXT',memo:"TEXT NOT NULL DEFAULT ''",start_date:'TEXT'};
export function preparationSql(existingColumns=[]) {
  const sql=['0007_anniversary_reminders.sql','0008_anniversary_coupons.sql','0009_payment_anniversary_access.sql','0011_kakao_members.sql']
    .map(name=>readFileSync(join(root,'migrations',name),'utf8')).join('\n');
  return sql+'\n'+Object.entries(detailColumns).filter(([name])=>!existingColumns.includes(name))
    .map(([name,type])=>'ALTER TABLE anniversary_reminders ADD COLUMN '+name+' '+type+';').join('\n');
}
export function parseWranglerResult(stdout) {
  // File imports can write spinner/progress text before the JSON, even with --json.
  const clean=stripVTControlCharacters(stdout).replace(/^\uFEFF/,'').trim();
  const starts=[0,...Array.from(clean.matchAll(/\n[ \t]*(?=\[)/g),match=>match.index+match[0].length)];
  for(const start of starts) {
    let data;try {data=JSON.parse(clean.slice(start))} catch {continue}
    if(!Array.isArray(data)||!data.length||data.some(item=>!item||item.success!==true||!Array.isArray(item.results))) throw new Error('Database command failed. Stop before publishing.');
    return data.flatMap(item=>item.results);
  }
  throw new Error('Database result could not be read. Changes may already have applied. Re-run preparation to inspect the current schema before publishing.');
}
export function wranglerArgs(args) {
  return [join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','daejeon-flower-db','--remote','--json',...args];
}
function execute(args,{schemaWrite=false}={}) {
  const result=spawnSync(process.execPath,wranglerArgs(args),{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,timeout:300000});
  if(result.error||result.status!==0) throw new Error(result.stderr||result.stdout||String(result.error));
  // Import progress is not a query result. Validate the actual schema below.
  return schemaWrite ? [] : parseWranglerResult(result.stdout);
}
export function main() {
  const tables=execute(['--command',"SELECT name FROM sqlite_master WHERE type='table'"]);
  if(!['customers','orders'].every(name=>tables.some(row=>row.name===name))) throw new Error('Existing shop database was not found. Stop before publishing.');
  const columns=execute(['--command','PRAGMA table_info(anniversary_reminders)']).map(row=>row.name);
  const temporary=mkdtempSync(join(tmpdir(),'dfds-db-'));
  try {
    console.log('Adding anniversary tables and missing fields. Existing customer/order records are retained.');
    const sql=preparationSql(columns),file=join(temporary,'anniversary.sql');
    writeFileSync(file,sql,'utf8');
    // SQL beginning "--" is interpreted as a CLI option when passed via --command.
    // Keep SQL/comments/newlines out of the argument list on every platform.
    execute(['--file',file,'--yes'],{schemaWrite:true});
    const after=execute(['--command','PRAGMA table_info(anniversary_reminders)']).map(row=>row.name);
    const names=execute(['--command',"SELECT name FROM sqlite_master WHERE type IN ('table','index','trigger')"]).map(row=>row.name);
    const expected=Array.from(sql.matchAll(/CREATE (?:UNIQUE )?(?:TABLE|INDEX|TRIGGER) IF NOT EXISTS (\w+)/g),match=>match[1]);
    if(!Object.keys(detailColumns).every(name=>after.includes(name))||!expected.every(name=>names.includes(name))) throw new Error('Schema verification failed. Stop before publishing.');
    console.log('Database preparation completed. Commit and Push the release files next. Automatic sending/payment switches were not changed.');
  } finally {rmSync(temporary,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {main()} catch(error) {console.error(error.message);process.exitCode=1}
}
