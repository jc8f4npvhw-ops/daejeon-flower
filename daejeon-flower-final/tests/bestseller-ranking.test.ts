import {test} from 'node:test';import assert from 'node:assert/strict';
import {rankProducts,salesKey} from '../src/frontend/bestseller-ranking';
import {publicBestsellers} from '../lib/server/bestsellers';
import {fixture} from './helpers';
test('flower M choices stay first and second while other SKUs follow actual sales',()=>{
 const rows=['대전꽃백화점 스타일','바이닐 스타일'].flatMap(style=>['S','M','L','XL','SPECIAL'].map(size=>({product:'꽃다발',style,size})));
 const sales={[salesKey(rows[9])]:500,[salesKey(rows[2])]:20};
 const ranked=rankProducts(rows,sales,true);assert.equal(ranked.length,10);assert.deepEqual(ranked.slice(0,2).map(salesKey),[salesKey(rows[1]),salesKey(rows[6])]);assert.equal(ranked[2],rows[9]);assert.equal(ranked[3],rows[2]);
 assert.equal(rankProducts(rows,sales,false)[0],rows[9]);
});
test('public sales exclude unpaid, cancelled, refunded and old orders and reveal no customer data',async()=>{
 const env=fixture();const product=env.sql.prepare("SELECT id FROM products WHERE code='BOUQUET'").get() as any;
 const variant=env.sql.prepare("SELECT id,code,style_id FROM product_variants WHERE product_id=? AND code='M' LIMIT 1").get(product.id) as any;
 for(const [n,payment,status,age,qty] of [[1,'PAID','DELIVERED',0,3],[2,'PENDING','PENDING_PAYMENT',0,10],[3,'PAID','CANCELLED',0,20],[4,'REFUNDED','DELIVERED',0,30],[5,'PAID','DELIVERED',100,40]] as any[]){
 env.sql.prepare("INSERT INTO orders(order_no,status,payment_status,fulfillment_type,orderer_name,orderer_phone,created_at) VALUES(?,?,?,'PICKUP','비공개 고객','01012345678',datetime('now',?))").run('BEST-'+n,status,payment,'-'+age+' days');
 env.sql.prepare("INSERT INTO order_items(order_id,product_id,style_id,variant_id,product_name_snapshot,style_name_snapshot,variant_name_snapshot,quantity) VALUES((SELECT id FROM orders WHERE order_no=?),?,?,?,'꽃다발','대전꽃백화점 스타일','M',?)").run('BEST-'+n,product.id,variant.style_id,variant.id,qty);
 }
 const response=await publicBestsellers(env as any);const body:any=await response.json();assert.equal(body.sales[JSON.stringify(['꽃다발','대전꽃백화점 스타일','M'])],3);assert(!JSON.stringify(body).includes('01012345678'));env.sql.close();
});
