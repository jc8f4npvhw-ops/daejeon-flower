import React,{useEffect,useState} from 'react';
import {reports,metrics,type Report} from '../../lib/ga4-reports';
type Traffic={rows:{labels:string[];values:number[]}[];rowCount:number;limited:boolean;summary:number[]|null};
type Api=(path:string,method?:string,body?:unknown,options?:{signal?:AbortSignal})=>Promise<{traffic:Traffic|null}>;
const format=(name:string,n:number)=>name==='engagementRate'?n.toLocaleString('ko-KR',{style:'percent',maximumFractionDigits:1}):n.toLocaleString('ko-KR');
const label=(name:Report,v:string)=>name==='daily'&&/^\d{8}$/.test(v)?v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6):name==='realtime'&&/^\d+$/.test(v)?v==='0'?'이번 분':v+'분 전':!v||v==='(not set)'?'미분류':v;
export function AdminTraffic({api,live}:{api:Api;live:boolean}){
 const [report,setReport]=useState<Report>('daily'),[days,setDays]=useState(7),[retry,setRetry]=useState(0);
 const [result,setResult]=useState<{key:string;traffic?:Traffic|null;error?:string}|null>(null);
 const key=report+':'+days+':'+retry;
 useEffect(()=>{
  if(!live)return;
  const c=new AbortController();
  api('/admin/traffic?days='+days+'&report='+report,'GET',undefined,{signal:c.signal})
   .then(({traffic})=>{if(!c.signal.aborted)setResult({key,traffic})})
   .catch(e=>{if(!c.signal.aborted)setResult({key,error:e instanceof Error?e.message:'통계를 불러오지 못했습니다.'})});
  return ()=>c.abort();
 },[api,days,report,key,live]);
 const current=result?.key===key?result:null,t=current?.traffic;
 const [title,,columns,mets]=reports[report];
 return <div className="aw-root"><section className="m-panel">
  <h3>홈페이지 방문 분석</h3>
  <div className="aw-toolbar">
   <label>보고서<select value={report} onChange={e=>{setResult(null);setReport(e.target.value as Report)}}>{Object.entries(reports).map(([k,v])=><option key={k} value={k}>{v[0]}</option>)}</select></label>
   {report!=='realtime'&&<label>조회 기간<select value={days} onChange={e=>{setResult(null);setDays(Number(e.target.value))}}>{[7,30,90].map(n=><option key={n} value={n}>최근 {n}일</option>)}</select></label>}
   {live&&<button type="button" onClick={()=>setRetry(n=>n+1)}>새로고침</button>}
   <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Google 애널리틱스 전체 보고서 ↗</a>
  </div>
  <p>{report==='realtime'?'최근 30분 · 분별 활성 사용자와 조회':'오늘 포함 · 오늘 수치는 늦게 반영될 수 있어요.'}</p>
  {!live&&<p>운영 관리자 화면에서 실제 통계를 볼 수 있어요.</p>}
  {live&&!current&&<p role="status">방문 통계를 불러오고 있습니다.</p>}
  {current?.error&&<p role="alert">{current.error}</p>}
  {t===null&&<p>Cloudflare의 GA4 속성 ID와 연결 시크릿을 확인해주세요.</p>}
  {t?.summary&&<div className="aw-metrics">{mets.map((name,i)=><article key={name}><span>{metrics[name]}</span><strong>{format(name,t.summary![i])}</strong></article>)}</div>}
  {t?.limited&&<p>Google의 집계 방식에 따라 일부 항목이 생략되거나 합쳐질 수 있어요.</p>}
  {t&&!t.rows.length&&<p className="m-empty">이 기간에 표시할 데이터가 아직 없어요.</p>}
  {!!t?.rows.length&&<div className="aw-table-wrap"><table>
   <caption>{title}{t.rowCount>t.rows.length?' · 상위 '+t.rows.length+'건':''}</caption>
   <thead><tr>{[...columns,...mets.map(n=>metrics[n])].map(n=><th key={n} scope="col">{n}</th>)}</tr></thead>
   <tbody>{t.rows.map((r,i)=><tr key={i}>{columns.map((n,j)=>j===0?<th key={n} scope="row">{label(report,r.labels[j]??'')}</th>:<td key={n}>{label(report,r.labels[j]??'')}</td>)}{mets.map((n,j)=><td key={n}>{format(n,r.values[j])}</td>)}</tr>)}</tbody>
  </table></div>}
 </section></div>;
}
