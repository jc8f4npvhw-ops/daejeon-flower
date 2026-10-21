import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers';
import {loadContent} from '../lib/server/content';
import {handleApi} from '../lib/server/router';
import {upgradeWreathRelease} from '../src/frontend/content-upgrades';

test('policy defaults preserve admin text and unconfirmed notices block real order intake',async()=>{
 const env=fixture();
 try{
  const content=await loadContent(env as any);
  assert.equal(content.settings.policiesConfirmed,false);
  assert(content.settings.orderPrivacy.includes('5년'));
  const custom={...content,settings:{...content.settings,terms:'매장 확정 약관',policiesConfirmed:true}};
  assert.equal(upgradeWreathRelease(custom).settings.terms,'매장 확정 약관');
  assert.equal(upgradeWreathRelease(custom).settings.policiesConfirmed,true);
  content.settings.paymentsEnabled=true;
  const save=()=>env.sql.prepare('INSERT OR REPLACE INTO content_blocks(block_key,payload_json) VALUES(?,?)').run('STOREFRONT_V1',JSON.stringify(content));
  save();
  const payload={sku:{product:'꽃다발',style:'대전꽃백화점 스타일',size:'M'},mode:'픽업',name:'주문자',phone:'01012345678',date:'2099-10-20',time:'09:00',privacy:true,termsAgreed:true,idempotencyKey:'notice_order_123456789'};
  const request=(path:string,data:any)=>new Request('https://store.example/api'+path,{method:'POST',headers:{origin:'https://store.example','Content-Type':'application/json'},body:JSON.stringify(data)});
  let response=await handleApi(request('/checkout',payload),env as any);
  assert.equal(response.status,503);
  response=await handleApi(request('/quotes',{...payload,mode:'배송',address:'대전 동구 가오동',receiver:'수령인',receiverPhone:'01012345678'}),env as any);
  assert.equal(response.status,503);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
  assert.equal(env.sql.prepare('SELECT COUNT(*) n FROM delivery_quotes').get().n,0);
  content.settings.policiesConfirmed=true;save();
  response=await handleApi(request('/checkout',{...payload,privacy:false}),env as any);
  assert.equal(response.status,400);
  response=await handleApi(request('/checkout',payload),env as any);
  assert.equal(response.status,201,await response.clone().text());
  const row=env.sql.prepare('SELECT policy_version,evidence_json FROM order_consents').get();
  const evidence=JSON.parse(String(row.evidence_json));
  assert.equal(evidence.policies.orderPrivacy,content.settings.orderPrivacy);
  assert.equal(evidence.policies.terms,content.settings.terms);
  assert.equal(evidence.marketingAgreed,false);
  assert.equal(evidence.anniversaryAgreed,false);
  assert.equal(evidence.publicPhotoAgreed,false);
  content.settings.terms='이후 변경된 약관';save();
  assert.equal(JSON.parse(String(env.sql.prepare('SELECT evidence_json FROM order_consents').get().evidence_json)).policies.terms,evidence.policies.terms);
 }finally{env.sql.close()}
});
