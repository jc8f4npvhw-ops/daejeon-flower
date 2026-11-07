import {useEffect} from 'react';
let profile:Promise<any>|null=null;
export function useMemberOrderPrefill(setName:any,setPhone:any){useEffect(()=>{if(typeof fetch!=='function'||!(window as any).DFDS_API_BASE)return;let active=true;if(!profile)profile=fetch('/api/auth/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);profile.then(p=>{if(active&&p){setName((current:string)=>current||p.name||'');setPhone((current:string)=>current||p.phone||'')}});return()=>{active=false}},[])}
