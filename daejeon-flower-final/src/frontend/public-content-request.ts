// One short-lived request shared by the entry chunk and the CMS loader.
// No browser storage or cached pricing: every entry loads the current server snapshot.
let pending:Promise<any>|null=null;
export function startPublicContentLoad(base='/api'){
 if(!pending){pending=fetch(base+'/public/content',{credentials:'include',headers:{'Content-Type':'application/json'}}).then(async r=>{const data:any=await r.json();if(!r.ok)throw Error(data.message||'연결 오류 ('+r.status+')');return data});pending.catch(()=>{});}
 return pending;
}
export async function consumePublicContent(base:string){const request=startPublicContentLoad(base);try{return await request}finally{if(pending===request)pending=null}}
