import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://xn--js0bx4ezvk5jm1b610k.com';
const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});
async function question(prompt,secret=false){return (await new Promise(resolve=>rl.question(prompt,resolve))).trim()}
function run(args,input){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[join(root,'node_modules/wrangler/bin/wrangler.js'),...args],{cwd:root,stdio:['pipe','inherit','inherit']});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Cloudflare setup failed. Stop before Push.')));child.stdin.on('error',()=>{});child.stdin.end(input)})}
try{
 if(!process.stdin.isTTY)throw Error('Open configure-kakao.cmd in a normal terminal window.');
 console.log('Kakao login configuration. Input is visible: do not share screenshots of keys.');
 console.log('Keys are sent to Cloudflare secrets, never written into source files.');
 console.log('First enable Kakao Login and register this redirect URI in Kakao Developers:');
 console.log(origin+'/api/auth/kakao/callback');
 if((await question('Have you completed the Kakao settings? Type YES: ')).toUpperCase()!=='YES')throw Error('Stopped. Complete Kakao settings first.');
 let rest=await question('REST API key (visible): ',true),secret=await question('Client Secret (visible): ',true);
 if(!/^[a-zA-Z0-9_-]{16,256}$/.test(rest)||!/^[a-zA-Z0-9_-]{16,256}$/.test(secret))throw Error('Check the REST API key and Client Secret format.');
 await run(['secret','put','KAKAO_REST_API_KEY'],rest);rest='';
 await run(['secret','put','KAKAO_CLIENT_SECRET'],secret);secret='';
 await run(['secret','put','PUBLIC_ORIGIN'],origin);
 const configPath=join(root,'wrangler.jsonc'),config=JSON.parse(readFileSync(configPath,'utf8'));config.vars.KAKAO_LOGIN_ENABLED='true';config.vars.KAKAO_LOGIN_TEST_ONLY='true';config.vars.KAKAO_LOGIN_SCOPES='';
 writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
 console.log('READY. Owner-only test login enabled in local configuration. Optional Kakao scopes remain empty until approved.');
 console.log('Run retry-db-preparation.cmd, then Commit and Push. No payment or message sending flags were enabled.');
}catch(e){console.error(e.message);process.exitCode=1}finally{rl.close()}
