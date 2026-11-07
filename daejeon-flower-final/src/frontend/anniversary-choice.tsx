import {DateInput} from './korean-calendar';
import React from 'react';
export const relationships=['가족','연인','배우자','소중한 사람'] as const;
export const occasionTypes=['생일','결혼기념일','사귄 날','기타'] as const;
export type AnniversaryDraft={relationship:string;occasion:string;memo:string;startDate:string;label:string;month:number;day:number};
export const newAnniversaryDraft=(month=1,day=1):AnniversaryDraft=>({relationship:'',occasion:'',memo:'',startDate:'',label:'',month,day});
export function anniversaryTitle(v:AnniversaryDraft){return v.occasion==='기타'?v.label.trim():`${v.relationship} ${v.occasion}`.trim()}
export function draftReady(v:AnniversaryDraft){return !!v.relationship&&!!v.occasion&&!!anniversaryTitle(v)&&(v.occasion!=='사귄 날'||!!v.startDate)}
const iso=(d:Date)=>d.toISOString().slice(0,10);
export function datingMilestones(start:string,today=iso(new Date(Date.now()+9*3600000))){
 const d=new Date(start+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(d.getTime())||iso(d)!==start)return null;
 const elapsed=Math.floor((Date.parse(today+'T00:00:00Z')-d.getTime())/86400000)+1;
 const nextHundred=Math.max(100,Math.ceil(elapsed/100)*100),year=+today.slice(0,4)-d.getUTCFullYear();
 const annual=(n:number)=>{const y=d.getUTCFullYear()+n,m=d.getUTCMonth();return iso(new Date(Date.UTC(y,m,Math.min(d.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate()))))};let nextYear=Math.max(1,year);if(annual(nextYear)<today)nextYear++;
 return {elapsed,days:[100,200,300,nextHundred,nextHundred+100].filter((n,i,a)=>a.indexOf(n)===i).map(n=>({title:n+'일',date:iso(new Date(d.getTime()+(n-1)*86400000))})),years:[1,nextYear,nextYear+1].filter((n,i,a)=>a.indexOf(n)===i).map(n=>({title:n+'주년',date:annual(n)}))};
}
export function DatingDates({startDate}:{startDate:string}){const result=datingMilestones(startDate);if(!result)return null;return <div className="moment-count"><strong>{result.elapsed>0?`오늘은 함께한 지 ${result.elapsed.toLocaleString('ko-KR')}일째`:'함께할 날을 기다리고 있어요'}</strong><div>{[...result.days,...result.years].sort((a,b)=>a.date.localeCompare(b.date)).map(x=><span key={x.title}><b>{x.title}</b><time dateTime={x.date}>{x.date.replaceAll('-','.')}</time></span>)}</div><small>만난 날을 1일로 계산해요. 쿠폰·알림은 매년 사귄 날짜를 기준으로 적용됩니다.</small></div>}
export function AnniversaryChoice({value:v,onChange,disabled=false}:{value:AnniversaryDraft;onChange:(v:AnniversaryDraft)=>void;disabled?:boolean}){
 const patch=(p:Partial<AnniversaryDraft>)=>onChange({...v,...p});
 return <div className="moment-choice"><fieldset disabled={disabled}><legend>누구의 기념일인가요?</legend><div className="moment-choice-grid">{relationships.map((r,i)=><button type="button" key={r} aria-pressed={v.relationship===r} onClick={()=>patch({relationship:r})}><span aria-hidden="true">{['⌂','♡','∞','✧'][i]}</span>{r}</button>)}</div></fieldset>
 {v.relationship&&<fieldset disabled={disabled}><legend>어떤 날을 기억할까요?</legend><div className="moment-choice-grid occasion-buttons">{occasionTypes.map(o=><button key={o} type="button" aria-pressed={v.occasion===o} onClick={()=>patch({occasion:o,startDate:o==='사귄 날'?v.startDate:'',label:''})}>{o}</button>)}</div></fieldset>}
 {v.relationship&&v.occasion&&<div className="moment-choice-details"><h3>{v.relationship} · {v.occasion}</h3>{v.occasion==='기타'&&<label className="mp-field">기념일 이름<input required maxLength={40} disabled={disabled} value={v.label} placeholder="예: 첫 출근, 개업한 날" onChange={e=>patch({label:e.target.value})}/></label>}
 {v.occasion==='사귄 날'?<><label className="mp-field">처음 사귄 날짜<DateInput required type="date" min="1900-01-01" max={iso(new Date(Date.now()+9*3600000))} disabled={disabled} value={v.startDate} onChange={e=>{const s=e.target.value;patch({startDate:s,...(s?{month:+s.slice(5,7),day:+s.slice(8,10)}:{})})}}/></label>{v.startDate&&<DatingDates startDate={v.startDate}/>}</>:<DateInput aria-label="기념일 날짜" recurring disabled={disabled} value={`2000-${String(v.month).padStart(2,'0')}-${String(v.day).padStart(2,'0')}`} onChange={e=>{const d=e.target.value;if(d)patch({month:+d.slice(5,7),day:+d.slice(8,10)})}} required/>}
 <label className="mp-field">메모 <small>선택</small><textarea rows={2} maxLength={300} value={v.memo} disabled={disabled} onChange={e=>patch({memo:e.target.value})} placeholder="예: 엄마 생신, 좋아하는 꽃은 분홍 장미"/></label></div>}</div>;
}
