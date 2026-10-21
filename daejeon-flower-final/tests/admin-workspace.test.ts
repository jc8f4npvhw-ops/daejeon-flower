import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture,passwordHash} from './helpers';import {handleApi} from '../lib/server/router';import {loadContent} from '../lib/server/content';
const origin='https://store.example';
const req=(path:string,method='GET',data?:any,h:any={})=>new Request(origin+'/api'+path,{method,headers:{origin,'Content-Type':'application/json',...h},...(data===undefined?{}:{body:JSON.stringify(data)})});
test('admin workspace enforces role boundaries, stores notes, blocks closed days and revokes staff sessions',async()=>{
 const env=fixture();try{
 const pass=await passwordHash('correct-password-123');
 for(const [name,role] of [['owner','OWNER'],['manager','MANAGER'],['driver','DRIVER']])env.sql.prepare('INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,?)').run(name,pass,name,role);
 const login=async(name:string)=>{const r=await handleApi(req('/admin/login','POST',{email:name,password:'correct-password-123'}),env as any);assert.equal(r.status,200);const b:any=await r.json();return {cookie:r.headers.get('set-cookie')!.split(';')[0],'X-CSRF-Token':b.csrf}};
 const owner=await login('owner'),manager=await login('manager'),driver=await login('driver');
 assert.equal((await handleApi(req('/admin/workspace'),env as any)).status,401);
 assert.equal((await handleApi(req('/admin/workspace','GET',undefined,driver),env as any)).status,403);
 let r=await handleApi(req('/admin/workspace?month=2026-10','GET',undefined,manager),env as any);assert.equal(r.status,200,await r.clone().text());assert(Array.isArray((await r.json() as any).daily));
 r=await handleApi(req('/admin/staff','GET',undefined,manager),env as any);assert.equal(r.status,403);
 r=await handleApi(req('/admin/staff','GET',undefined,owner),env as any);assert.equal(r.status,200);assert(!JSON.stringify(await r.json()).includes('password_hash'));
 env.sql.prepare('INSERT INTO customers(name,phone_normalized) VALUES(?,?)').run('테스트 회원','01012345678');
 r=await handleApi(req('/admin/customers/1','PATCH',{note:'보라 계열 선호'},manager),env as any);assert.equal(r.status,200);
 r=await handleApi(req('/admin/customers/1','GET',undefined,manager),env as any);assert.equal((await r.json() as any).notes.note,'보라 계열 선호');
 r=await handleApi(req('/admin/closures','PUT',{date:'2099-10-20',closed:true,reason:'매장 휴무'},manager),env as any);assert.equal(r.status,200);
 const content=await loadContent(env as any);content.settings.paymentsEnabled=true;content.settings.policiesConfirmed=true;env.sql.prepare('INSERT INTO content_blocks(block_key,payload_json) VALUES(?,?)').run('STOREFRONT_V1',JSON.stringify(content));
 const payload={sku:{product:'꽃다발',style:'대전꽃백화점 스타일',size:'M'},mode:'배송',name:'고객',phone:'01012345678',address:'대전 가오동',receiver:'받는 분',receiverPhone:'01012345678',date:'2099-10-20',time:'10:00',privacy:true,termsAgreed:true,idempotencyKey:'closed_day_123456789'};
 r=await handleApi(req('/quotes','POST',payload),env as any);assert.equal(r.status,400);assert((await r.json() as any).message.includes('휴무'));
 r=await handleApi(req('/admin/staff/1','PATCH',{role:'MANAGER',active:true},owner),env as any);assert.equal(r.status,400);
 r=await handleApi(req('/admin/staff/2','PATCH',{role:'MANAGER',active:false},owner),env as any);assert.equal(r.status,200);
 assert.equal((await handleApi(req('/admin/workspace','GET',undefined,manager),env as any)).status,403);
 r=await handleApi(req('/admin/staff','POST',{username:'new-driver',displayName:'배송 직원',role:'DRIVER',password:'another-password-123'},owner),env as any);assert.equal(r.status,201);
 r=await handleApi(req('/admin/staff/1','PATCH',{role:'OWNER',active:true,password:'new-password-12345',currentPassword:'wrong'},owner),env as any);assert.equal(r.status,400);
 r=await handleApi(req('/admin/staff/3','PATCH',{role:'DRIVER',active:true,password:'new-password-12345'},owner),env as any);assert.equal(r.status,200);
 assert.equal((await handleApi(req('/admin/session','GET',undefined,driver),env as any)).status,403);
 assert(Number(env.sql.prepare('SELECT COUNT(*) n FROM admin_activity').get().n)>=4);
 }finally{env.sql.close()}
});

test('all customers are searchable beyond 500 and counted, with ten records per server page',async()=>{
 const env=fixture();try{
 const pass=await passwordHash('correct-password-123');env.sql.prepare('INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,?)').run('owner',pass,'owner','OWNER');
 const login=await handleApi(req('/admin/login','POST',{email:'owner',password:'correct-password-123'}),env as any);const h={cookie:login.headers.get('set-cookie')!.split(';')[0]};
 const insert=env.sql.prepare('INSERT INTO customers(name,phone_normalized) VALUES(?,?)');for(let i=1;i<=523;i++)insert.run(i===1?'오래된 회원':'고객 '+i,'0100000'+String(i).padStart(4,'0'));
 const get=async(path:string)=>{const r=await handleApi(req(path,'GET',undefined,h),env as any);assert.equal(r.status,200,await r.clone().text());return await r.json() as any};
 const workspace=await get('/admin/workspace?month=2026-10');assert.equal(workspace.customerCount,523);assert.equal(workspace.customers.length,0);
 const first=await get('/admin/customers');assert.equal(first.total,523);assert.equal(first.customers.length,10);assert.equal(first.pages,53);assert.equal(first.customers[0].id,523);
 const last=await get('/admin/customers?page=53');assert.equal(last.customers.length,3);assert.equal(last.customers.at(-1).id,1);
 const old=await get('/admin/customers?q='+encodeURIComponent('오래된 회원'));assert.equal(old.total,1);assert.equal(old.customers[0].id,1);
 const phone=await get('/admin/customers?q=01000000001');assert(phone.customers.some((c:any)=>c.id===1));
 assert.equal((await get('/admin/customers?q=%25')).total,0);assert.equal((await get('/admin/customers?page=999')).page,53);
 assert.equal((await handleApi(req('/admin/customers'),env as any)).status,401);
 assert.equal((await handleApi(req('/admin/customers?page=-1','GET',undefined,h),env as any)).status,400);
 }finally{env.sql.close()}
});
