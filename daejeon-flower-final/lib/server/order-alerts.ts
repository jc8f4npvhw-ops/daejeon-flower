import {admin} from './auth';
import {Env,assert,json} from './types';
const pending="o.payment_status IN ('PAID','PARTIAL_REFUND') AND o.status IN ('NEW','IN_PRODUCTION') AND NOT EXISTS(SELECT 1 FROM order_alert_acknowledgements a WHERE a.order_id=o.id)";
export async function orderAlerts(req:Request,env:Env,path:string):Promise<Response|null>{
 const match=path.match(/^\/admin\/order-alerts\/(\d+)\/acknowledge$/);
 if(!(path==='/admin/order-alerts'&&req.method==='GET')&&!(match&&req.method==='POST'))return null;
 const user=await admin(req,env);
 // This feature requires the additive 0003 migration; fail visibly until applied.
 const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_alert_acknowledgements'").first();assert(table,503,'주문 알림 DB 연결이 필요합니다. 추가 migration 0003 적용 여부를 확인해주세요.');
 if(match){const id=Number(match[1]);assert(Number.isSafeInteger(id),400,'주문 번호를 확인해주세요.');assert(await env.DB.prepare('SELECT id FROM orders WHERE id=?').bind(id).first(),404,'주문을 찾지 못했습니다.');
 await env.DB.batch([env.DB.prepare(`INSERT OR IGNORE INTO order_alert_acknowledgements(order_id,acknowledged_by) SELECT o.id,? FROM orders o WHERE o.id=? AND ${pending}`).bind(user.id,id),env.DB.prepare("INSERT INTO admin_activity(admin_user_id,action,target_type,target_id) SELECT ?,'새 주문 확인','order',? WHERE changes()=1").bind(user.id,String(id))]);
 }
 const total:any=await env.DB.prepare('SELECT COUNT(*) total FROM orders o WHERE '+pending).first();
 const {results}=await env.DB.prepare(`SELECT o.id,o.order_no,o.orderer_name,o.fulfillment_type,o.fulfillment_at,o.total_krw,o.created_at,(SELECT group_concat(product_name_snapshot || ' ' || COALESCE(variant_name_snapshot,''),' / ') FROM order_items WHERE order_id=o.id) product_name FROM orders o WHERE ${pending} ORDER BY o.created_at,o.id LIMIT 50`).all();
 return json({orders:results,total:Number(total?.total||0),checkedAt:new Date().toISOString()});
}
