import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './helpers';import {handleApi} from '../lib/server/router';import {readNotice,noticeURL} from '../lib/server/notice-reader';
const origin='https://store.example';
const req=(data:any)=>new Request(origin+'/api/notices/read',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
test('free endpoint rejects capture uploads and never invokes a paid provider',async()=>{const env:any=fixture();try{
 assert.equal((await handleApi(req({kind:'funeral',method:'link',url:'https://samga.co.kr/obituary/indv/123'}),env)).status,503);
 env.NOTICE_READER_ENABLED='true';env.OPENAI_API_KEY='legacy-key-must-never-be-used';let calls=0;
 await assert.rejects(()=>readNotice(req({kind:'funeral',method:'capture',image:'data:image/png;base64,abcd'}),env,async()=>{calls++;throw Error('No external call allowed')}),(e:any)=>e.status===400);assert.equal(calls,0);
 assert.equal(env.objects.size,0);assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
 }finally{env.sql.close()}});
test('HTTPS allowlist and redirect checks survive without a paid fallback',async()=>{const env:any=fixture();Object.assign(env,{NOTICE_READER_ENABLED:'true',NOTICE_ALLOWED_HOSTS:'notice.example'});try{
 for(const url of ['http://notice.example/a','https://127.0.0.1/a','https://notice.example@evil.example/a','https://notice.example.evil.test/a','https://[::1]/a'])assert.throws(()=>noticeURL(url,env.NOTICE_ALLOWED_HOSTS));
 let calls=0;await assert.rejects(()=>readNotice(req({kind:'wedding',method:'link',url:'https://notice.example/a'}),env,async()=>{calls++;return new Response('<html>Unsupported invitation layout</html>',{headers:{'Content-Type':'text/html'}})}),(e:any)=>e.status===422);assert.equal(calls,1);
 await assert.rejects(()=>readNotice(req({kind:'funeral',method:'link',url:'https://notice.example/a'}),env,async()=>new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}})),(e:any)=>e.status===400);
 }finally{env.sql.close()}});
test('link requests remain rate limited',async()=>{const env:any=fixture();env.NOTICE_READER_ENABLED='true';try{
 const fetcher=async()=>new Response('<html>Unknown layout</html>',{headers:{'Content-Type':'text/html'}});
 for(let i=0;i<10;i++)await assert.rejects(()=>readNotice(req({kind:'funeral',method:'link',url:'https://samga.co.kr/obituary/indv/123'}),env,fetcher),(e:any)=>e.status===422);
 await assert.rejects(()=>readNotice(req({kind:'funeral',method:'link',url:'https://samga.co.kr/obituary/indv/123'}),env,fetcher),(e:any)=>e.status===429);
 }finally{env.sql.close()}});
