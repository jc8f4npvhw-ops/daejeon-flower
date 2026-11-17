import React,{useEffect,useState} from 'react';

type Traffic={activeUsers:number;sessions:number;pageViews:number};
type GetTraffic=(path:string,method?:string,body?:unknown,options?:{signal?:AbortSignal})=>Promise<{traffic:Traffic|null}>;

export function AdminTraffic({api}:{api:GetTraffic}) {
 const [days,setDays]=useState(7),[retry,setRetry]=useState(0);
 const [result,setResult]=useState<{days:number;retry:number;traffic?:Traffic|null;error?:string}|null>(null);
 useEffect(()=>{
   const controller=new AbortController();
   api('/admin/traffic?days='+days,'GET',undefined,{signal:controller.signal}).then(({traffic})=>{
     if(!controller.signal.aborted) setResult({days,retry,traffic});
   }).catch((error:unknown)=>{
     if(!controller.signal.aborted) setResult({days,retry,error:error instanceof Error?error.message:'통계를 불러오지 못했습니다.'});
   });
   return ()=>controller.abort();
 },[api,days,retry]);
 const current=result?.days===days&&result.retry===retry?result:null;
 const traffic=current?.traffic;
 return <section className="m-panel">
   <h3>홈페이지 방문 통계</h3>
   <div className="aw-toolbar">
     <label>방문 조회 기간<select value={days} onChange={e=>setDays(Number(e.target.value))}>
       <option value={7}>최근 7일</option><option value={30}>최근 30일</option>
     </select></label>
     <span>Google 애널리틱스 · 오늘 포함 · 집계가 늦게 반영될 수 있어요.</span>
   </div>
   {!current&&<p role="status">방문 통계를 불러오고 있습니다.</p>}
   {current?.error&&<><p role="alert">{current.error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>다시 시도</button></>}
   {current?.traffic===null&&<p>아직 관리자 통계에 GA4가 연결되지 않았어요. 읽기 권한 설정 후 확인할 수 있습니다.</p>}
   {traffic&&<div className="aw-metrics">
     {([['활성 사용자',traffic.activeUsers,'GA4가 집계한 활성 사용자'],['방문',traffic.sessions,'같은 사람의 재방문을 포함한 세션'],['페이지 조회',traffic.pageViews,'페이지가 열린 횟수']] as const).map(([name,value,description])=>
       <article key={name}><span>{name}</span><strong>{value.toLocaleString('ko-KR')}</strong><small>{description}</small></article>)}
   </div>}
 </section>;
}
