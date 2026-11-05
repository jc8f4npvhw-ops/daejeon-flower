import {Env,json,variantCode} from './types';
import {loadContent} from './content';
export async function publicBestsellers(env:Env){
 const rows:any=await env.DB.prepare(`SELECT i.product_name_snapshot product,COALESCE(i.style_name_snapshot,'') style,COALESCE(v.code,i.variant_name_snapshot,'') size,SUM(i.quantity) sold FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN product_variants v ON v.id=i.variant_id WHERE o.payment_status='PAID' AND o.status IN ('NEW','IN_PRODUCTION','PICKED_UP','DELIVERED') AND o.created_at>=datetime('now','-90 days') GROUP BY i.product_name_snapshot,COALESCE(i.style_name_snapshot,''),COALESCE(v.code,i.variant_name_snapshot,'')`).all();
 const content=await loadContent(env);const sales:Record<string,number>={};for(const row of rows.results||[]){const product=content.products.find((p:any)=>p.name===row.product||p.id===row.product);const variant=product?.variants.find((v:any)=>(v.style||'')===row.style&&variantCode(product.id,v.size)===row.size);if(product&&variant)sales[JSON.stringify([product.id,row.style,variant.size])]=Number(row.sold)||0;}
 return json({sales});
}
