import {test} from 'node:test';import assert from 'node:assert/strict';
import {sizeGalleryPhotos,validateGalleryPhotos,pinnedPhotoKeys} from '../src/frontend/size-gallery-data';
const style='대전꽃백화점 스타일',sku={product:'꽃다발',style,size:'M'};
test('representatives stay ahead of approved recent photos, with exact product/style/size and deduplication',()=>{
 const base=Array.from({length:5},(_,i)=>({path:'base-'+i,src:'/api/media/public/base-'+i+'.png'}));
 const make=(id:string,extra:any={})=>({id,imageKey:id,sku,status:'published',privacyChecked:true,permissionConfirmed:true,...extra});
 const data:any={products:[{id:'꽃다발',variants:[{style,size:'M'}]}],covers:{a:{src:'/api/media/public/a.png'},b:{src:'/api/media/public/b.png'},bad:{src:'/api/media/public/bad.png'}},reviewFeed:[make('a'),make('bad',{sku:{...sku,size:'L'}}),make('bad',{sku:{...sku,style:'바이닐 스타일'}}),make('bad',{status:'draft'}),make('bad',{privacyChecked:false}),make('bad',{permissionConfirmed:false}),make('b')]};
 assert.deepEqual(sizeGalleryPhotos(data,'꽃다발',style,'M',base).map(p=>p.src),[...base.slice(0,3).map(p=>p.src),data.covers.b.src,data.covers.a.src,...base.slice(3).map(p=>p.src)]);
 const explicit=base.map((p,i)=>({...p,pinned:i===1||i===4}));assert.deepEqual(sizeGalleryPhotos(data,'꽃다발',style,'M',explicit).slice(0,2).map(p=>p.path),['base-1','base-4']);assert.equal(pinnedPhotoKeys(explicit).size,2);
 data.reviewFeed=[];data.guides={꽃다발:{pages:[{size:'M',visible:true,style:'바이닐 스타일',photoKey:'bad'}]}};assert(!sizeGalleryPhotos(data,'꽃다발',style,'M',base).some(p=>p.src===data.covers.bad.src));
 data.galleries={test:base.map(p=>({...p,pinned:true}))};assert.throws(()=>validateGalleryPhotos(data),/최대 3장/);data.galleries={};data.reviewFeed=[make('a',{sku:{...sku,size:'INVALID'}})];assert.throws(()=>validateGalleryPhotos(data),/사이즈/);
});
