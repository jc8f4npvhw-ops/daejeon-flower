"use client";
import {startPublicContentLoad} from '../src/frontend/public-content-request';
import {useEffect,useRef} from 'react';

function LoadingStore({photo}:{photo?:string}){
 return photo?<div className="app-shell"><section className="intent-hero" aria-busy="true">
  <img src={photo} alt="" fetchPriority="high" loading="eager"/>
  <div className="intent-hero-copy"><h1>대전꽃백화점</h1><p role="status">매장 정보를 불러오고 있습니다.</p></div>
 </section></div>:<p style={{textAlign:'center',padding:40}}>매장 정보를 불러오고 있습니다.</p>;
}

export default function Client({initialPhoto}:{initialPhoto?:string}={}){
 const el=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let cleanup:(()=>void)|undefined,mounted=true;
  (window as any).DFDS_API_BASE='/api';
  startPublicContentLoad('/api');
  import('../src/frontend/redesign').then(mod=>{
   if(mounted&&el.current)cleanup=mod.mount(el.current,<LoadingStore photo={initialPhoto}/>);
  });
  return()=>{mounted=false;cleanup?.()};
 },[initialPhoto]);
 return <div ref={el}><LoadingStore photo={initialPhoto}/></div>;
}
