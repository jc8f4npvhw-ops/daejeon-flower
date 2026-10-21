// Synthetic examples only. Never seed these into D1 or send them to the API.
export function octoberDemoOrders(){
 const products=[['바이닐 스타일 꽃다발 M',57000],['대전꽃백화점 스타일 꽃바구니 L',70000],['금전수 M',100000],['축하 3단',100000],['계절 동양난 · 투각분',100000],['대전꽃백화점 스타일 꽃다발 S',35000]] as const;
 const times=[['09:30','14:00'],['10:00','16:30'],['11:30','18:00'],['09:00','15:00'],['12:00','19:30']];
 return Array.from({length:62},(_,i)=>{const day=Math.floor(i/2)+1,slot=i%2,product=products[i%products.length],mode=(day+slot)%3===0?'배송':'픽업';const status=day<19?(mode==='픽업'?'PICKED_UP':'DELIVERED'):'NEW';const skus=[{product:'꽃다발',style:'바이닐 스타일',size:'M'},{product:'꽃바구니',style:'대전꽃백화점 스타일',size:'L'},{product:'금전수',style:'',size:'M'},{product:'축하화환',style:'',size:'축하 3단'},{product:'동양난',style:'',size:'투각분'},{product:'꽃다발',style:'대전꽃백화점 스타일',size:'S'}];return {sku:skus[i%skus.length],id:i+1,orderNo:`DEMO-202610${String(day).padStart(2,'0')}-${slot+1}`,productName:product[0],customerName:`예시 고객 ${String(i+1).padStart(2,'0')}`,phone:'010-0000-'+String(i+1).padStart(4,'0'),fulfillment:mode,requestedDate:'2026-10-'+String(day).padStart(2,'0'),requestedTime:times[(day-1)%times.length][slot],total:product[1]+(mode==='배송'?5000:0),status,version:0,address:mode==='배송'?'예시 배송지 · 대전 동구 (실제 주소 아님)':'',request:'색감과 포장을 확인해주세요. · 예시 요청사항',message:'마음을 전합니다. · 예시 문구',allowedTransitions:status==='NEW'?['IN_PRODUCTION','CANCELLED']:[]}});
}

let sharedOrders:any[]=null;
export function getDemoOrders(){return sharedOrders??=octoberDemoOrders()}
export function setDemoOrders(orders:any[]){sharedOrders=orders}

/** Preview only: fill today's catalog test coverage without touching existing orders/photos. */
export function ensureTodayDemoOrders(orders:any[],products:any[],now=new Date()){
 const day=new Date(now.getTime()+9*3600000).toISOString().slice(0,10),targets:any[]=[];
 for(const p of products.filter(p=>p.active&&['FLOWER','PLANT','CEREMONY','PROPOSE'].includes(p.group))){
  const variants=p.variants.filter((v:any)=>v.active&&!v.retired);if(!variants.length)continue;
  let selected:any[]=[];
  if(['꽃다발','꽃바구니'].includes(p.id)){for(const style of [...new Set(variants.map((v:any)=>v.style))])selected.push(variants.find((v:any)=>v.style===style&&v.size==='M')||variants.find((v:any)=>v.style===style));}
  else if(p.id==='동양난'||p.group==='CEREMONY')selected=variants;
  else if(p.id==='서양난')selected=variants.filter((v:any)=>['6만원','10만원'].includes(v.size));
  else if(p.id==='JUST ROSE')selected=[variants.find((v:any)=>v.size==='30송이')||variants[0]];
  else if(p.id==='호텔')selected=[variants.find((v:any)=>v.size==='BASIC')||variants[0]];
  else selected=[variants.find((v:any)=>v.size==='M')||variants[0]];
  if(!selected.length)selected=[variants[0]];for(const v of selected)targets.push({p,v});
 }
 const next=[...orders],ids=new Set(next.map(o=>o.id));
 targets.forEach(({p,v},i)=>{const sku={product:p.id,style:v.style,size:v.size},testKey=JSON.stringify(sku);if(next.some(o=>o.requestedDate===day&&o.previewTestKey===testKey))return;
 let id=Number(day.replaceAll('-',''))*1000+i+500;while(ids.has(id))id++;ids.add(id);const mins=9*60+Math.floor(i*24/Math.max(1,targets.length-1))*30;
 next.push({id,previewTestKey:testKey,sku,orderNo:'TEST-'+day.replaceAll('-','')+'-'+String(i+1).padStart(2,'0'),productName:[p.name,v.style,v.label||v.size].filter(Boolean).join(' · '),customerName:'사진 확인 '+String(i+1).padStart(2,'0'),phone:'010-0000-'+String(1000+i),fulfillment:'배송',requestedDate:day,requestedTime:String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0'),total:v.price??null,status:'NEW',version:0,address:'테스트 배송지 · 대전 동구 가오동',request:'배송사진 등록 → 배송완료 → 제작사진 모아보기에서 공개 → 고객 상세페이지 확인',message:'제작사진 확인용',allowedTransitions:['IN_PRODUCTION','CANCELLED']});
 });return next;
}
