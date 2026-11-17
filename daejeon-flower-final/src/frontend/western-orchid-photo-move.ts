type Photo = {src:string;path?:string;[key:string]:unknown};
type Variant = {id:string;style?:string;size:string;label?:string;retired?:boolean;active?:boolean};
export type PhotoGroup = {id:string;style:string;size:string;label:string};

export function westernOrchidPhotoGroups(variants:Variant[]):PhotoGroup[]{
 const groups=[{id:'',style:'',size:'',label:'상품 공통 사진'}];
 const seen=new Set(['["",""]']);
 for(const v of variants){
  if(v.retired||!v.size)continue;
  const style=(v.style||'').replace(/\s/g,''),key=JSON.stringify([style,v.size]);
  if(seen.has(key))continue;
  seen.add(key);
  groups.push({id:v.id,style,size:v.size,label:(v.label||v.size)+(v.active===false?' · 숨김':'')});
 }
 return groups;
}

export function moveWesternOrchidPhoto(source:Photo[],destination:Photo[],photo:Photo,group:PhotoGroup){
 const index=source.findIndex(p=>p.src===photo.src&&p.path===photo.path);
 if(index<0)return null;
 const it=source[index];
 const duplicate=destination.some(p=>p.src===it.src);
 if(!duplicate&&it.path&&destination.some(p=>p.path===it.path))return null;
 return {
  source:source.filter((_,i)=>i!==index),
  destination:duplicate?destination:[...destination,{...it,product:'서양난',style:group.style,size:group.size,role:'product'}]
 };
}
