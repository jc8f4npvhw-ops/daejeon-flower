import React,{useEffect,useState} from 'react';
import './admin-google-statistics.css';
type Row={label:string;values:number[]};
type Statistics={property:string;days:number;realtime:number|null;timeZone:string|null;summary:number[];trend:Row[];
  channels:Row[];sources:Row[];pages:Row[];devices:Row[];regions:Row[];events:Row[];limited:boolean;checkedAt:string};
const ranges=[[1,'오늘'],[7,'최근 7일'],[30,'최근 30일'],[90,'최근 90일']] as const;
const n=(v:number|undefined)=>Number(v??0).toLocaleString('ko-KR');
const percent=(v:number|undefined)=>((v??0)*100).toLocaleString('ko-KR',{maximumFractionDigits:1})+'%';
const duration=(v:number|undefined)=>{const t=Math.max(0,Math.round(v??0));return (t>=60?Math.floor(t/60)+'분 ':'')+(t%60)+'초'};
const date=(label:string)=>/^\d{8}$/.test(label)?label.slice(0,4)+'.'+label.slice(4,6)+'.'+label.slice(6):label;
const labels:Record<string,string>={'Organic Search':'자연 검색','Direct':'직접 방문','Referral':'다른 사이트','Organic Social':'소셜','Paid Search':'검색 광고','desktop':'PC','mobile':'휴대폰','tablet':'태블릿','(not set)':'정보 없음','(direct) / (none)':'직접 방문','/':'홈페이지','page_view':'페이지 조회','session_start':'방문 시작','first_visit':'첫 방문','user_engagement':'사이트 이용'};
const friendly=(label:string)=>labels[label]??label;
function Table({title,label,metrics,rows,format}:{title:string;label:string;metrics:string[];rows:Row[];format?:(v:string)=>string}){
  return <section className="ags-panel">
    <h3>{title}</h3>
    {rows.length?<div className="ags-table-wrap"><table><thead><tr><th scope="col">{label}</th>{metrics.map(m=><th key={m} scope="col">{m}</th>)}</tr></thead>
      <tbody>{rows.map((row,i)=><tr key={row.label+':'+i}><th scope="row">{(format??friendly)(row.label)}</th>
        {metrics.map((m,j)=><td key={m}>{m==='참여율'?percent(row.values[j]):n(row.values[j])}</td>)}</tr>)}</tbody>
    </table></div>:<p className="ags-muted">선택한 기간에 표시할 통계가 없어요.</p>}
  </section>;
}
export function AdminGoogleStatistics({api,live}:{api:(path:string,method?:string)=>Promise<Statistics>;live:boolean}){
  const [days,setDays]=useState(7),[refresh,setRefresh]=useState(0),[data,setData]=useState<Statistics|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(live);
  const [metric,setMetric]=useState(1);
  useEffect(()=>{
    if(!live)return;
    let active=true;
    setBusy(true);setError('');
    void api('/admin/google-statistics?days='+days,'GET').then(r=>{if(active)setData(r)}).catch(e=>{
      if(active){setData(null);setError(e instanceof Error?e.message:'통계를 불러오지 못했어요.');}
    }).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[api,days,refresh,live]);
  const visible=data?.days===days?data:null;
  const max=Math.max(1,...(visible?.trend??[]).map(r=>r.values[metric]??0));
  const summary=visible?.summary??[];
  const tiles=[['실시간 이용자',visible?.realtime==null?'—':n(visible.realtime),'최근 30분'],['이용자',n(summary[0]),'선택 기간 내 활동한 사람'],
    ['방문',n(summary[1]),'사이트 이용을 시작한 횟수'],['페이지 조회',n(summary[2]),'페이지를 본 전체 횟수'],
    ['참여율',percent(summary[3]),'의미 있는 활동이 있었던 방문 비율'],['평균 방문 시간',duration(summary[4]),'방문 한 번당 평균']];
  return <section className="ags-root" aria-label="구글 통계">
    <header className="ags-head">
      <div><h2>홈페이지 방문 분석</h2><p>방문자가 어디에서 들어오고 어떤 페이지를 보는지 확인하세요.</p></div>
      {visible&&<a href={'https://analytics.google.com/analytics/web/#/p'+visible.property+'/reports/intelligenthome'} target="_blank" rel="noopener noreferrer">Google 애널리틱스에서 전체 보고서 보기 ↗</a>}
    </header>
    {!live?<p className="ags-panel">운영 관리자 화면에서 구글 통계를 볼 수 있어요.</p>:<>
      <div className="ags-tools"><label>조회 기간 <select value={days} onChange={e=>setDays(Number(e.target.value))}>
        {ranges.map(([d,text])=><option key={d} value={d}>{text}</option>)}</select></label>
        <button type="button" onClick={()=>setRefresh(v=>v+1)} disabled={busy}>다시 불러오기</button>
      </div>
      {busy&&<p role="status">구글 통계를 불러오는 중이에요.</p>}
      {error&&<p role="alert" className="ags-panel">{error}</p>}
      {visible&&<>
        <p className="ags-muted">일반 보고서는 오늘을 포함하며 최신 수치가 늦게 반영될 수 있어요.{visible.timeZone?' 집계 기준: '+visible.timeZone+'.':''}</p>
        {visible.limited&&<p className="ags-muted">일부 숫자는 구글의 개인정보 보호 기준에 따라 표시되지 않거나 묶여 있을 수 있어요.</p>}
        <div className="ags-tiles">{tiles.map(([name,value,desc])=><div key={name} className="ags-panel"><span>{name}</span><strong>{value}</strong><small>{desc}</small></div>)}</div>
        <section className="ags-panel"><h3>날짜별 추이</h3>
          <label>차트 지표 <select value={metric} onChange={e=>setMetric(Number(e.target.value))}><option value={0}>이용자</option><option value={1}>방문</option><option value={2}>페이지 조회</option></select></label>
          {visible.trend.length>0&&<div className="ags-trend" aria-hidden="true">{visible.trend.map(row=><div key={row.label}
            title={date(row.label)+': '+n(row.values[metric])} style={{height:Math.max(2,(row.values[metric]??0)/max*100)+'%'}}/>)}</div>}
          <details><summary>날짜별 숫자 보기</summary>
            <Table title="일별 집계" label="날짜" metrics={['이용자','방문','페이지 조회']} rows={[...visible.trend].reverse()} format={date}/>
          </details>
        </section>
        <div className="ags-reports">
          <Table title="유입 유형" label="유형" metrics={['방문','이용자','참여율']} rows={visible.channels}/>
          <Table title="유입 사이트·매체" label="출처 / 매체" metrics={['방문','이용자','참여율']} rows={visible.sources}/>
          <Table title="인기 페이지" label="페이지" metrics={['조회','이용자']} rows={visible.pages}/>
          <Table title="접속 기기" label="기기" metrics={['방문','이용자']} rows={visible.devices}/>
          <Table title="방문 지역" label="지역" metrics={['이용자','방문']} rows={visible.regions}/>
          <Table title="홈페이지에서 한 행동" label="행동" metrics={['횟수','이용자']} rows={visible.events}/>
        </div>
        <p className="ags-muted">마지막 확인: {new Date(visible.checkedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)</p>
      </>}
    </>}
  </section>;
}
