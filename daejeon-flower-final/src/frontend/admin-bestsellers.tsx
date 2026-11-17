import React,{useEffect,useState} from 'react';
import {bestsellerRows,rankProducts,salesKey,type BestsellerGroup} from './bestseller-ranking';

const label=(p:any)=>[p.name,p.style,p.label].filter(Boolean).join(' · ');
export function AdminBestsellers({draft,busy,apiBase,live,onChange}:{
 draft:any;busy:boolean;apiBase:string;live:boolean;onChange:(group:BestsellerGroup,keys:string[])=>void;
}){
 const [group,setGroup]=useState<BestsellerGroup>('FLOWER');
 const [choice,setChoice]=useState('');
 const [sales,setSales]=useState<Record<string,number>>({});
 const [status,setStatus]=useState(live?'판매량을 불러오는 중…':'미리보기');
 useEffect(()=>{
  if(!live)return;
  const controller=new AbortController();
  fetch(apiBase+'/public/bestsellers',{signal:controller.signal}).then(r=>{
   if(!r.ok)throw Error();
   return r.json();
  }).then(data=>{setSales(data.sales||{});setStatus('')}).catch(()=>{
   if(!controller.signal.aborted)setStatus('판매량을 불러오지 못했습니다. 화면을 다시 열어주세요.');
  });
  return()=>controller.abort();
 },[live,apiBase]);
 const rows=bestsellerRows(draft,group),byKey=new Map<string,any>(rows.map((p:any)=>[salesKey(p),p]));
 const configured=draft.bestsellerOrder?.[group];
 const keys:string[]=Array.isArray(configured)?[...new Set<string>(configured.filter(k=>byKey.has(k)))].slice(0,10):[];
 const available=rows.filter((p:any)=>!keys.includes(salesKey(p))).sort((a:any,b:any)=>label(a).localeCompare(label(b),'ko'));
 const move=(index:number,offset:number)=>{const next=[...keys],to=index+offset;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];onChange(group,next)};
 const preview=rankProducts(rows,sales,group==='FLOWER',keys);
 return <section className="m-panel"><h2>베스트셀러 순서</h2><p>지정한 상품은 위에서부터 먼저 보여요. 남은 자리는 최근 90일 판매량 순으로 채워집니다.</p>
 <div className="m-actions"><button type="button" aria-pressed={group==='FLOWER'} onClick={()=>{setGroup('FLOWER');setChoice('')}}>꽃</button><button type="button" aria-pressed={group==='PLANT'} onClick={()=>{setGroup('PLANT');setChoice('')}}>식물</button></div>
 <h3>우선 노출 순서</h3>{keys.length?<ol>{keys.map((key,index)=><li key={key}>{label(byKey.get(key))} <button type="button" disabled={busy||index===0} aria-label={label(byKey.get(key))+' 위로'} onClick={()=>move(index,-1)}>↑</button> <button type="button" disabled={busy||index===keys.length-1} aria-label={label(byKey.get(key))+' 아래로'} onClick={()=>move(index,1)}>↓</button> <button type="button" disabled={busy} onClick={()=>onChange(group,keys.filter(k=>k!==key))}>우선 노출 해제</button></li>)}</ol>:<p>판매량에 따라 자동으로 정렬하고 있어요.</p>}
 <label className="m-field"><span>우선 노출할 상품</span><select value={choice} onChange={e=>setChoice(e.target.value)} disabled={busy||keys.length>=10}><option value="">상품 선택</option>{available.map((p:any)=><option key={salesKey(p)} value={salesKey(p)}>{label(p)}</option>)}</select></label>
 <div className="m-actions"><button type="button" disabled={busy||keys.length>=10||!available.some((p:any)=>salesKey(p)===choice)} onClick={()=>{onChange(group,[...keys,choice]);setChoice('')}}>우선 노출에 추가</button><button type="button" disabled={busy||!keys.length} onClick={()=>onChange(group,[])}>판매량 순으로 되돌리기</button></div>
 <h3>고객 화면 순서 미리보기</h3>{status&&<p role="status">{status}</p>}<ol>{preview.map(p=><li key={salesKey(p)}>{label(p)}{keys.includes(salesKey(p))?' · 우선 노출':''}{!status?' · 판매 '+(sales[salesKey(p)]||0)+'건':''}</li>)}</ol><p className="m-help">순서를 변경한 뒤 ‘저장하고 적용’을 눌러주세요.</p></section>;
}
