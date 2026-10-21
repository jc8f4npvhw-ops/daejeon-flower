export const catalogGroups:Record<string,string>={FLOWER:'꽃',PLANT:'식물',PROPOSE:'프로포즈',WEDDING:'웨딩',CEREMONY:'화환','FLOWER CLASS':'클래스',PRESERVED:'프리저브드'};
export const categoryDefinitions=[
 ['FLOWER_BOUQUET','FLOWER','꽃다발','꽃다발'],['FLOWER_BASKET','FLOWER','꽃바구니','꽃바구니'],['FLOWER_VASE','FLOWER','화병꽃이','화병꽃이'],['FLOWER_CENTERPIECE','FLOWER','센터피스','센터피스'],
 ['PLANT_FOLIAGE','PLANT','관엽화분','foliage'],['PLANT_ORIENTAL_ORCHID','PLANT','동양난','동양난'],['PLANT_WESTERN_ORCHID','PLANT','서양난','서양난'],
 ['PROPOSE_JUST_ROSE','PROPOSE','JUST ROSE','JUST ROSE'],['PROPOSE_TRUNK','PROPOSE','트렁크','트렁크'],['PROPOSE_HOTEL','PROPOSE','호텔','호텔'],
 ['WEDDING_SHOOT','WEDDING','촬영부케','촬영부케'],['WEDDING_MAIN','WEDDING','본식부케','본식부케'],['WEDDING_SPACE','WEDDING','공간장식','공간장식'],
 ['CEREMONY_CONDOLENCE','CEREMONY','근조화환','근조화환'],['CEREMONY_CELEBRATION','CEREMONY','축하화환','축하화환'],['FLOWER_CLASS','FLOWER CLASS','플라워 클래스','플라워 클래스']
].map(([code,group,label,template])=>({code,group,label,template}));
export function productCategory(p:any){return (p.categoryCode?.startsWith('CAT_')?{code:p.categoryCode,group:p.group,label:p.categoryLabels?.at(-1)||p.name,template:'generic'}:undefined)||categoryDefinitions.find(c=>c.code===p.categoryCode&&c.group===p.group)||categoryDefinitions.find(c=>c.group===p.group&&c.template===p.id)||categoryDefinitions.find(c=>c.group===p.group);}
export function catalogPath(p:any,v?:any){const c=productCategory(p);const labels=[...(p.categoryCode?.startsWith('CAT_')?(p.categoryLabels||[p.groupName||p.group,c?.label]):[p.groupName||catalogGroups[p.group]||p.group,c?.label]),p.name||p.id,v?.style,v?.label||v?.size].filter(Boolean) as string[];return labels.filter((value,i)=>i===0||value!==labels[i-1]);}
export function newCatalogProduct(group:string,categoryCode:string,name:string,products:any[],id:string,categories=categoryDefinitions){
 const category=categories.find(c=>c.code===categoryCode&&c.group===group);if(!category)throw Error('상품 분류를 확인해주세요.');const base=products.find(p=>p.id===category.template);const variants=base?.variants?.length?base.variants:[{style:'',size:'M',active:true}];
 return {id,name:name.trim(),group,categoryCode,templateId:category.template,custom:true,active:false,mode:group==='FLOWER'||group==='PLANT'?(base?.mode||'order'):'consult',description:'',pickup:categoryCode.startsWith('CAT_')||['FLOWER','PLANT'].includes(group),delivery:group!=='WEDDING'&&group!=='FLOWER CLASS',variants:variants.map((v:any,i:number)=>({id:id+':'+i,style:v.style||'',size:v.size||'',label:v.label||v.size||'기본 구성',price:null,active:true}))};
}
