import {KoreanCalendar} from './korean-calendar';
import {shopDate,pastReservationTime} from './reservation-time';
import {StepReveal,goToStep} from "./step-motion";
import React,{useState,useId,useEffect} from 'react';
const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function useShopClock(){const [now,setNow]=useState(()=>Date.now());useEffect(()=>{let timer:any;const refresh=()=>{clearTimeout(timer);setNow(Date.now());timer=setTimeout(refresh,60000-Date.now()%60000+10)};refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearTimeout(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)}},[]);return now}
export function DatePicker({label,value,setValue,required=false}:any){
 const now=useShopClock(),min=shopDate(now),today=new Date(min+'T00:00:00');
 useEffect(()=>{if(value&&value<min)setValue('')},[value,min]);
 return <fieldset className="schedule-picker date-picker"><legend>{label}{required?' *':''}</legend><KoreanCalendar gridClassName="calendar-grid" value={value} onChange={setValue} min={min}/><p className="schedule-summary" aria-live="polite">{value?`${value.replaceAll('-','.')} 선택`:'날짜를 선택해주세요'}</p></fieldset>
}
export function TimeButtons({label,value,setValue,times,required=true,date=''}:any){const now=useShopClock();useEffect(()=>{if(value&&pastReservationTime(date,value,now))setValue('')},[date,value,now]);return <fieldset className="schedule-picker"><legend>{label}{required?' *':''}</legend>{[['오전',0,12],['오후',12,24]].map(([title,start,end])=>{const slots=times.filter((t:string)=>Number(t.slice(0,2))>=Number(start)&&Number(t.slice(0,2))<Number(end));return slots.length>0&&<div className="time-period" key={title}><b>{title}</b><div className="time-grid">{slots.map((t:string)=><button type="button" key={t} disabled={pastReservationTime(date,t,now)} title={pastReservationTime(date,t,now)?'이미 지난 시간입니다':undefined} aria-pressed={value===t&&!pastReservationTime(date,t,now)} className={value===t&&!pastReservationTime(date,t,now)?'selected':''} onClick={()=>{if(!pastReservationTime(date,t))setValue(t)}}>{t}</button>)}</div></div>})}<p className="schedule-summary" aria-live="polite">{value&&!pastReservationTime(date,value,now)?`${value} 선택`:'회색으로 표시된 지난 시간은 선택할 수 없습니다.'}</p></fieldset>}
export function SchedulePicker({label,date,setDate,time,setTime,times,nextStepId,motion=true}:any){
 const timeId=useId()+'-time';const Panel=motion?StepReveal:'div';
 const dateLabel=date?new Date(date+'T12:00:00').toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'}):'';
 return <section className="reservation-schedule" aria-label={label}><h3>{label} <span>*</span></h3><p className="help">날짜를 먼저 고른 뒤, 원하는 시간을 30분 단위로 선택해주세요.</p><DatePicker label="수령 날짜" value={date} setValue={(v:string)=>{setDate(v);if(v!==date)setTime('');goToStep(timeId)}}/>{date?<Panel id={timeId} className="schedule-time-step"><TimeButtons label={`${dateLabel} 받을 시간`} date={date} value={time} setValue={(v:string)=>{setTime(v);if(v&&nextStepId)goToStep(nextStepId)}} times={times}/>{time&&<p className="reservation-confirm" role="status">✓ {dateLabel} · {time} 선택</p>}</Panel>:<p className="schedule-empty">날짜를 선택하면 시간 목록이 나타납니다.</p>}</section>
}
