export const bestsellerGroups=['FLOWER','PLANT'] as const;
export type BestsellerGroup=typeof bestsellerGroups[number];
export const salesKey=(p:any)=>JSON.stringify([p.product,p.style||'',p.size]);
export function bestsellerRows(data:any,group:BestsellerGroup,isVisible:(code:string)=>boolean=()=>true){
 return data.products.filter((p:any)=>p.group===group&&p.active&&isVisible(p.categoryCode?.startsWith('CAT_')?p.categoryCode:group)).flatMap((p:any)=>{
  const item={product:p.id,name:p.name,group};
  const variants=p.mode==='consult'?[]:(p.variants||[]).filter((v:any)=>v.active&&!v.retired&&v.price>0);
  return variants.length?variants.map((v:any)=>({...item,variantId:v.id,style:v.style||'',size:v.size,label:v.label||v.size,price:v.price})):
   [{...item,style:'',size:'',label:'',price:null}];
 });
}
export function rankProducts(rows:any[],sales:Record<string,number>,flower:boolean,custom?:unknown,limit=10){
 const recommended=(p:any)=>flower&&p.product==='꽃다발'&&p.size==='M'?p.style==='대전꽃백화점 스타일'?0:p.style==='바이닐 스타일'?1:2:2;
 const rank=(p:any)=>Number(sales[salesKey(p)])||0;
 const byKey=new Map(rows.map(p=>[salesKey(p),p]));
 const ordered=(Array.isArray(custom)?[...new Set(custom.filter(k=>typeof k==='string'))]:[]).slice(0,10);
 const fixed=ordered.flatMap(k=>byKey.has(k)?[byKey.get(k)]:[]);
 const pinned=new Set(fixed.map(salesKey));
 return [...fixed,...rows.filter(p=>!pinned.has(salesKey(p))).sort((a,b)=>rank(b)-rank(a)||recommended(a)-recommended(b)||String(a.name||a.product).localeCompare(String(b.name||b.product),'ko')||(Number(a.price)||0)-(Number(b.price)||0)||salesKey(a).localeCompare(salesKey(b),'ko'))].slice(0,limit);
}
