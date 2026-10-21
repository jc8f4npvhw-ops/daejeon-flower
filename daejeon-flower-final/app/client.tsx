"use client";
import {useEffect,useRef} from 'react';
export default function Client(){const el=useRef<HTMLDivElement>(null);useEffect(()=>{let cleanup:any;let mounted=true;(window as any).DFDS_API_BASE='/api';import('../src/frontend/redesign').then(mod=>{if(mounted&&el.current)cleanup=mod.mount(el.current)});return()=>{mounted=false;cleanup?.()}},[]);return <div ref={el}><p style={{textAlign:'center',padding:40}}>매장 정보를 불러오고 있습니다.</p></div>}
