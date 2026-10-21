import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {fixture,passwordHash} from './helpers';
import {handleApi} from '../lib/server/router';

test('remembered admin sessions last 30 days in DB and cookie; ordinary sessions last 8 hours; logout and expiry revoke access',async()=>{
 const env=fixture(),origin='https://store.example';
 const request=(path:string,method='GET',data?:any,headers:any={})=>new Request(origin+'/api'+path,{method,headers:{origin,'content-type':'application/json',...headers},...(data?{body:JSON.stringify(data)}:{})});
 try{
  env.sql.prepare("INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,'OWNER')").run('owner',await passwordHash('correct-password-123'),'관리자');
  for(const rememberMe of [false,true]){
   const r=await handleApi(request('/admin/login','POST',{email:'owner',password:'correct-password-123',rememberMe}),env as any);assert.equal(r.status,200);
   const raw=r.headers.get('set-cookie')!,cookie=raw.split(';')[0],auth:any=await r.json();
   assert(raw.includes('Max-Age='+(rememberMe?2592000:28800)));for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/'])assert(raw.includes(flag));
   const row:any=env.sql.prepare("SELECT id,CAST(strftime('%s',expires_at)-strftime('%s',created_at) AS INTEGER) seconds FROM admin_sessions ORDER BY id DESC LIMIT 1").get();
   assert.equal(row.seconds,rememberMe?2592000:28800);
   assert.equal((await handleApi(request('/admin/session','GET',undefined,{cookie}),env as any)).status,200);
   if(rememberMe){
    assert.equal((await handleApi(request('/admin/logout','POST',{}, {cookie,'x-csrf-token':auth.csrf}),env as any)).status,200);
   }else env.sql.prepare("UPDATE admin_sessions SET expires_at=datetime('now','-1 second') WHERE id=?").run(row.id);
   assert.equal((await handleApi(request('/admin/session','GET',undefined,{cookie}),env as any)).status,403);
  }
  const invalid=await handleApi(request('/admin/login','POST',{email:'owner',password:'correct-password-123',rememberMe:'true'}),env as any);assert.equal(invalid.status,400);
 }finally{env.sql.close()}
});

test('login options save only the username locally and request browser password storage only after successful login',async()=>{
 const bundled=await build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import {AdminLogin} from './src/frontend/admin-login';createRoot(document.getElementById('root')).render(<AdminLogin onLogin={async input=>{window.requests.push(input);if(window.rejectLogin)throw Error('로그인 실패')}}/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
 const dom=new JSDOM('<div id="root"></div>',{url:'https://store.example/admin',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window as any;
 try{
  w.requests=[];w.rejectLogin=true;w.localStorage.setItem('dfds-admin-username','owner');
  Object.defineProperty(w,'isSecureContext',{value:true});const credentials:any[]=[];
  w.PasswordCredential=class{constructor(data:any){Object.assign(this,data)}};
  Object.defineProperty(w.navigator,'credentials',{value:{store:async(c:any)=>{credentials.push(c)}}});
  w.eval(bundled.outputFiles[0].text);
  const wait=()=>new Promise(r=>setTimeout(r,30));
  for(let i=0;i<30&&!w.document.querySelector('input[name=username]')?.value;i++)await wait();
  const inputs=w.document.querySelectorAll('input'),checks=w.document.querySelectorAll('input[type=checkbox]');
  assert.equal(inputs[0].value,'owner');assert.equal(checks.length,3);assert(checks[1].checked);assert(!checks[0].checked);assert(!checks[2].checked);
  const set=Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value')!.set!;
  set.call(inputs[1],'private-password-123');inputs[1].dispatchEvent(new w.Event('input',{bubbles:true}));
  checks[0].click();checks[2].click();await wait();
  w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(w.requests[0].rememberMe,true);assert.equal(credentials.length,0);assert(w.document.body.textContent.includes('로그인 실패'));
  w.rejectLogin=false;w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  assert.equal(credentials.length,1);assert.equal(credentials[0].password,'private-password-123');
  assert.equal(w.localStorage.length,1);assert.equal(w.localStorage.getItem('dfds-admin-username'),'owner');
  checks[1].click();await wait();assert.equal(w.localStorage.length,0);
 }finally{w.close()}
});
