export const salesKey=(p:any)=>JSON.stringify([p.product,p.style||'',p.size]);
export function rankProducts(rows:any[],sales:Record<string,number>,flower:boolean){
 const fixed=flower?['대전꽃백화점 스타일','바이닐 스타일'].flatMap(style=>{const p=rows.find(p=>p.product==='꽃다발'&&p.style===style&&p.size==='M');return p?[p]:[]}):[];
 const pinned=new Set(fixed.map(salesKey));
 return [...fixed,...rows.filter(p=>!pinned.has(salesKey(p))).sort((a,b)=>(sales[salesKey(b)]||0)-(sales[salesKey(a)]||0))].slice(0,10);
}
