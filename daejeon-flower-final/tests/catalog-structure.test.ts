import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture,passwordHash} from './helpers';import {loadContent} from '../lib/server/content';import {handleApi} from '../lib/server/router';import {productCode} from '../lib/server/types';import {catalogPath,newCatalogProduct} from '../src/frontend/catalog-structure';
const origin='https://store.example';const req=(path:string,method='GET',data?:any,headers:any={})=>new Request(origin+'/api'+path,{method,headers:{origin,'Content-Type':'application/json',...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
test('new products retain selected category and styles in D1; reservation detail retains classification snapshot',async()=>{
 const env=fixture();try{
 env.sql.prepare("INSERT INTO admin_users(username,password_hash,display_name,role) VALUES(?,?,?,'OWNER')").run('owner',await passwordHash('correct-password-123'),'운영자');
 let r=await handleApi(req('/admin/login','POST',{email:'owner',password:'correct-password-123'}),env as any);const session:any=await r.json(),headers={cookie:r.headers.get('set-cookie')!.split(';')[0],'X-CSRF-Token':session.csrf};
 const content=await loadContent(env as any);content.settings.paymentsEnabled=true;content.settings.policiesConfirmed=true;
 const choices=[['FLOWER','FLOWER_BASKET'],['PLANT','PLANT_FOLIAGE'],['PROPOSE','PROPOSE_TRUNK'],['WEDDING','WEDDING_MAIN']];const created=choices.map(([g,c],i)=>newCatalogProduct(g,c,'새 상품 '+i,content.products,'product-test-'+i));
 created[0].active=true;created[0].variants.forEach((v:any)=>v.price=55000);created[1].variants[0].price=90000;content.products.push(...created);
 r=await handleApi(req('/admin/content','PUT',{expectedRevision:content.revision,content},headers),env as any);assert.equal(r.status,200,await r.clone().text());const saved:any=(await r.json() as any).content;
 for(let i=0;i<choices.length;i++){const p=env.sql.prepare('SELECT p.id,c.code FROM products p JOIN categories c ON c.id=p.category_id WHERE p.code=?').get(productCode(created[i].id));assert.equal(p.code,choices[i][1]);assert.equal(Number(env.sql.prepare('SELECT COUNT(*) n FROM product_variants WHERE product_id=?').get(p.id).n),created[i].variants.length)}
 const flowerId=env.sql.prepare('SELECT id FROM products WHERE code=?').get(productCode(created[0].id)).id;assert.equal(Number(env.sql.prepare('SELECT COUNT(*) n FROM product_styles WHERE product_id=?').get(flowerId).n),2);
 const plant=saved.products.find((p:any)=>p.id===created[1].id);plant.variants[0].price=95000;
 r=await handleApi(req('/admin/content','PUT',{expectedRevision:saved.revision,content:saved},headers),env as any);assert.equal(r.status,200,await r.clone().text());const plantId=env.sql.prepare('SELECT id FROM products WHERE code=?').get(productCode(plant.id)).id;assert.equal(Number(env.sql.prepare('SELECT COUNT(*) n FROM product_variants WHERE product_id=?').get(plantId).n),1);
 const v=created[0].variants[0],payload={sku:{product:created[0].id,style:v.style,size:v.size},mode:'픽업',name:'예약 고객',phone:'01012345678',date:'2099-10-20',time:'10:00',privacy:true,termsAgreed:true,idempotencyKey:'new_category_order_1234567',card:'감사합니다'};
 r=await handleApi(req('/checkout','POST',payload),env as any);assert.equal(r.status,201,await r.clone().text());const order=env.sql.prepare('SELECT id FROM orders ORDER BY id DESC').get();
 r=await handleApi(req('/admin/reservations/'+order.id,'GET',undefined,headers),env as any);assert.equal(r.status,200);const detail:any=await r.json();assert.equal(detail.customerName,'예약 고객');assert.deepEqual(detail.items[0].path,catalogPath(created[0],v));assert.equal(detail.items[0].messages[0].card_message,'감사합니다');
 assert.equal((await handleApi(req('/admin/reservations/'+order.id),env as any)).status,401);
 }finally{env.sql.close()}
});
