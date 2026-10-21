export const flowerGalleryStyles=['대전꽃백화점 스타일','바이닐 스타일'];
export const flowerGallerySizes=(product:string)=>product==='꽃바구니'?['M','L','XL','SPECIAL']:['S','M','L','XL','SPECIAL'];
export const photoIdentity=(p:any)=>p.path||p.src;
export function pinnedPhotoKeys(images:any[]){const explicit=images.some(p=>Object.hasOwn(p,'pinned'));return new Set((explicit?images.filter(p=>p.pinned===true):images.slice(0,3)).slice(0,3).map(photoIdentity))}
export function sizeGalleryPhotos(data:any,product:string,style:string,size:string,base:any[]){
 const unique=(rows:any[])=>{const seen=new Set();return rows.filter(p=>{if(!p?.src||seen.has(p.src))return false;seen.add(p.src);return true})};
 const pins=pinnedPhotoKeys(base),guide=data.guides?.[product]?.pages?.find((p:any)=>p.size===size&&p.visible&&p.style===style),guidePhoto=guide&&data.covers?.[guide.photoKey];
 const explicit=base.some(p=>Object.hasOwn(p,'pinned'));
 const pinned=unique([...(!explicit&&guidePhoto?[guidePhoto]:[]),...base.filter(p=>pins.has(photoIdentity(p)))]).slice(0,3);
 const published=(data.reviewFeed||[]).map((p:any,i:number)=>({...p,position:i})).filter((p:any)=>p.status==='published'&&p.privacyChecked===true&&p.permissionConfirmed===true&&p.sku?.product===product&&p.sku?.style===style&&p.sku?.size===size&&data.covers?.[p.imageKey]).sort((a:any,b:any)=>b.position-a.position).map((p:any)=>({...data.covers[p.imageKey],source:'공개 제작사진'}));
 return unique([...pinned,...published,...base.filter(p=>!pinned.some(im=>im.src===p.src)),...(guidePhoto?[guidePhoto]:[])]);
}
export function validateGalleryPhotos(data:any){
 for(const images of Object.values(data.galleries||{}) as any[]){if(!Array.isArray(images))continue;if(images.filter(p=>p.pinned===true).length>3||images.some(p=>p.pinned!==undefined&&typeof p.pinned!=='boolean'))throw Error('앞에 고정할 대표사진은 최대 3장입니다.')}
 for(const p of data.reviewFeed||[]){if(p.sourceDeliveryId&&!p.sku)throw Error('배송사진의 상품·스타일·사이즈를 선택해주세요.');if(p.sku!==undefined){const s=p.sku;if(!s||typeof s.product!=='string'||typeof s.style!=='string'||typeof s.size!=='string'||!data.products?.some((x:any)=>x.id===s.product&&x.variants?.some((v:any)=>!v.retired&&v.style===s.style&&v.size===s.size)))throw Error('제작사진의 상품·스타일·사이즈를 확인해주세요.');}}
}
