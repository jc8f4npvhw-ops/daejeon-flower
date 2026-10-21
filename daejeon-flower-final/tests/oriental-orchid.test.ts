import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {fixture} from './helpers';import {loadContent,BLOCK} from '../lib/server/content';import {createCheckout,quotePrice} from '../lib/server/orders';import {orientalOrchids,upgradeOrientalOrchids} from '../src/frontend/oriental-orchid-data';import {variantCode} from '../lib/server/types';
test('four orchid variants retain old references, honor admin choices and checkout with correct variety/price',async()=>{
 const env:any=fixture();try{
 const c=await loadContent(env),p=c.products.find((p:any)=>p.id==='동양난');assert.deepEqual(p.variants.filter((v:any)=>v.active).map((v:any)=>[v.size,v.price]),orientalOrchids.map(o=>[o.size,o.price]));assert.equal(p.variants.filter((v:any)=>v.retired&&!v.active).length,3);
 const changed=structuredClone(c);changed.products.find((p:any)=>p.id==='동양난').variants.find((v:any)=>v.size==='산천조').active=false;assert.equal(upgradeOrientalOrchids(changed).products.find((p:any)=>p.id==='동양난').variants.find((v:any)=>v.size==='산천조').active,false);
 env.sql.exec(fs.readFileSync(new URL('../migrations/0005_oriental_orchid_varieties.sql',import.meta.url),'utf8'));assert.equal(env.sql.prepare("SELECT COUNT(*) n FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.code='ORIENTAL_ORCHID'").get().n,7);
 c.settings.paymentsEnabled=true;c.settings.policiesConfirmed=true;c.settings.privacy='확인';c.settings.terms='약관';c.settings.refund='환불';env.sql.prepare('INSERT INTO content_blocks(block_key,payload_json) VALUES(?,?)').run(BLOCK,JSON.stringify(c));
 for(const o of orientalOrchids){assert.equal(variantCode('동양난',o.size),o.code);const b={sku:{product:'동양난',style:'',size:o.size},mode:'픽업',name:'예시 주문자',phone:'01012345678',date:'2099-12-01',time:'10:00',privacy:true,termsAgreed:true,idempotencyKey:'orchid-checkout-'+o.code,customization:{orchidVariety:o.name,orchidConfiguration:o.size}};assert.equal(quotePrice(c,b).total,o.price);await createCheckout(env,b,'https://store.example');const item:any=env.sql.prepare('SELECT * FROM order_items ORDER BY id DESC LIMIT 1').get();assert.equal(item.unit_price_krw,o.price);assert.equal(item.variant_name_snapshot,o.size);assert.equal(JSON.parse(item.customization_json).orchidVariety,o.name);assert(item.variant_id)}
 assert.equal(env.objects.size,0);
 }finally{env.sql.close()}
});
