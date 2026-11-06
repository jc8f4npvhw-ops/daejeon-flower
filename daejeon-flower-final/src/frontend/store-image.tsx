import React from 'react';
import {optimizedMedia} from './optimized-media';
type Props=React.ImgHTMLAttributes<HTMLImageElement>&{priority?:boolean};
export function StoreImage({src,sizes='(min-width: 700px) 600px, 100vw',priority=false,loading,...props}:Props){
 const variants=typeof src==='string'?optimizedMedia[src]:undefined;
 const unique=variants?.filter((v,i,all)=>all.findIndex(x=>x.width===v.width)===i);
 return <img {...props} src={src} srcSet={unique?.map(v=>v.src+' '+v.width+'w').join(', ')} sizes={unique?sizes:undefined} loading={priority?'eager':loading||'lazy'} decoding="async" fetchPriority={priority?'high':undefined} onError={e=>{const el=e.currentTarget;if(el.srcset&&!el.dataset.originalFallback){el.dataset.originalFallback='true';el.removeAttribute('srcset');if(typeof src==='string')el.src=src}else props.onError?.(e)}}/>;
}
