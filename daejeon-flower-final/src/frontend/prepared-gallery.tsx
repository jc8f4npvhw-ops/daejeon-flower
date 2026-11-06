import {useEffect,useState} from 'react';
import {optimizedMedia} from './optimized-media';
type Photo={src:string};
type Priority='high'|'low';
const cache=new Map<string,Promise<string>>();
export const largePhotoSource=(src:string)=>optimizedMedia[src]?.at(-1)?.src||src;
export const smallPhotoSource=(src:string)=>optimizedMedia[src]?.[0]?.src||src;
export function decodePhotoUrl(url:string,priority:Priority='high'):Promise<string>{
 const prior=cache.get(url);if(prior)return prior;
 const promise=new Promise<string>((resolve,reject)=>{
  const image=new Image();let done=false;
  const timer=setTimeout(()=>finish(new Error('사진 응답 시간 초과')),20000);
  function finish(error?:Error){if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;if(error)reject(error);else resolve(url)}
  image.decoding='async';image.fetchPriority=priority;
  image.onload=()=>{if(typeof image.decode==='function')image.decode().then(()=>finish(),()=>finish(new Error('사진을 표시할 수 없습니다.')));else finish()};
  image.onerror=()=>finish(new Error('사진을 불러오지 못했습니다.'));image.src=url;
 });
 cache.set(url,promise);promise.catch(()=>{if(cache.get(url)===promise)cache.delete(url)});
 if(cache.size>48)cache.delete(cache.keys().next().value!);
 return promise;
}
export function preparePhoto(src:string,priority:Priority='high'){
 const url=largePhotoSource(src);
 return decodePhotoUrl(url,priority).catch(error=>{if(url===src)throw error;return decodePhotoUrl(src,priority)});
}
export function warmAdjacentPhotos(photos:Photo[],index:number){for(const i of [index-1,index+1])if(photos[i])preparePhoto(photos[i].src,'low').catch(()=>{})}
export function usePreparedGallery(photos:Photo[],requested:number,active=true){
 const index=Math.max(0,Math.min(photos.length-1,requested||0));
 const key=photos.map(p=>p.src).join('\n');
 const fallback={key,index,src:photos[index]?smallPhotoSource(photos[index].src):'',ready:false,error:''};
 const [view,setView]=useState(fallback),[attempt,setAttempt]=useState(0);
 const shown=view.key===key?view:fallback;
 useEffect(()=>{
  if(!active||!photos[index])return;
  let current=true;
  setView(v=>({...(v.key===key?v:fallback),error:''}));
  preparePhoto(photos[index].src).then(src=>{if(current)setView({key,index,src,ready:true,error:''})}).catch(()=>{if(current)setView(v=>({...(v.key===key?v:fallback),error:'사진을 불러오지 못했습니다.'}))});
  warmAdjacentPhotos(photos,index);
  return()=>{current=false};
 },[key,index,active,attempt]);
 return {...shown,loading:active&&(!shown.ready||shown.index!==index),retry:()=>setAttempt(n=>n+1)};
}
