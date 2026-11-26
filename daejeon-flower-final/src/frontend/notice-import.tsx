import React,{useEffect,useRef,useState} from 'react';
import {readNoticeCapture} from './notice-ocr';
import {parseNoticeText} from './notice-text';
import {live,apiBase} from './cms';
import {AdminPanelDialog} from './admin-dialog';
import {noticeFieldLabels,noticeFormValues,cleanNoticeFields} from './notice-fields';
export function NoticeImport({kind,method,url,sharedText,onUseCapture,attachment,current,onApply}:any){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[canRetry,setCanRetry]=useState(false),[candidate,setCandidate]=useState<any>(null),[open,setOpen]=useState(false),[attempt,setAttempt]=useState(0),[applied,setApplied]=useState(false);
 const generation=useRef(0),apply=useRef(onApply);apply.current=onApply;
 useEffect(()=>{const version=++generation.current;let active=true;const controller=new AbortController();setCandidate(null);setOpen(false);setError('');setCanRetry(false);setApplied(false);setBusy(false);setProgress('');
 const ready=method==='capture'?!!attachment?.src:method==='link'&&/^https?:\/\/[^\s]+$/i.test(url||'');if(!ready)return()=>{active=false;controller.abort()};
 const timer=setTimeout(async()=>{if(method==='link'&&!live){setError('자동 읽기는 서버 연결 후 사용할 수 있습니다. 아래 정보를 직접 입력해주세요.');return}setBusy(true);const timeout=setTimeout(()=>controller.abort(),35000);let retry=true;
 try{
 let data:any;
 if(method==='capture'){data=await readNoticeCapture(attachment.src,kind,controller.signal,s=>{if(active&&version===generation.current)setProgress(s)})}
 else{const r=await fetch(apiBase+'/notices/read',{method:'POST',credentials:'include',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,method:'link',url})});data=await r.json().catch(()=>({}));if(!r.ok){
  retry=r.status>=500||r.status===429;
  if(r.status===422){
   const copied=String(sharedText||'').replace(/https?:\/\/[^\s<>]+/gi,'');
   const parsed=parseNoticeText(copied,kind);
   if(Object.keys(parsed.fields).length){
    data={...parsed,text:'',warnings:['링크 대신 복사한 문구에서 확인할 수 있는 내용을 읽었어요.',...parsed.warnings]};
   }else{
    throw Error((/열람 기간|원본 링크/.test(data.message||'')?data.message+' ':'링크에서 내용을 자동으로 읽지 못했어요. ')+'링크를 첨부한 채 아래 정보를 입력하거나 캡처를 올려주세요.');
   }
  }else throw Error(data.message||'안내장을 읽지 못했습니다.');
 }}
 const fields=cleanNoticeFields(data.fields);
 const sourceEvidence=data.evidence||{};
 const person=noticeFormValues(fields,kind).person;
 const personEvidence=noticeFormValues(sourceEvidence,kind).person;
 if(person)fields.person=person;
 for(const field of ['groom','bride','deceasedName','chiefMourner','recipientPhone'])delete fields[field];
 const evidence={...sourceEvidence,person:personEvidence};
 if(!Object.keys(fields).length&&!data.text)throw Error(data.message||'읽을 수 있는 내용을 찾지 못했습니다. 직접 입력해주세요.');if(active&&version===generation.current){setCandidate({fields,text:typeof data.text==='string'?data.text.slice(0,20000):'',evidence,warnings:Array.isArray(data.warnings)?data.warnings.filter((v:any)=>typeof v==='string').slice(0,5):[]});setOpen(true)}
 }catch(e:any){if(active&&version===generation.current){setCanRetry(retry);setError(e.name==='AbortError'?'자동 읽기 시간이 초과되었습니다. 직접 입력하거나 다시 시도해주세요.':e.message)}}finally{clearTimeout(timeout);if(active&&version===generation.current)setBusy(false)}},method==='link'?850:0);
 return()=>{active=false;generation.current++;clearTimeout(timer);controller.abort()}
 },[kind,method,url,sharedText,attachment?.src,attempt]);
 if(method==='manual')return null;
 const labels:Record<string,string>={...noticeFieldLabels,person:kind==='funeral'?'고인 또는 상주 성함':'신랑 / 신부 성함'};
 const keys=['hall','address','room','person',...(kind==='funeral'?['departureDate']:['date','time'])];
 return <div className="notice-import"><p className="help">캡처 사진은 이 기기 안에서 글자를 읽습니다. 지원하는 링크는 페이지의 정보를 직접 읽고, 확인한 정보만 주문 입력란에 적용됩니다.</p>{busy&&<p role="status">{method==='capture'?(progress||'사진 속 글자를 읽을 준비를 하고 있어요…'):'안내장에서 장소·일정·성함을 읽고 있어요…'}</p>}{error&&<><p role="alert">{error}</p>{canRetry&&<button type="button" onClick={()=>setAttempt(n=>n+1)}>자동 읽기 다시 시도</button>}{method==='link'&&onUseCapture&&<button type="button" className="text-link" onClick={onUseCapture}>캡처로 읽기</button>}</>}{candidate&&!busy&&<><p role="status">{applied?'읽어온 내용을 입력했습니다. 빈칸과 잘못된 정보가 없는지 확인해주세요.':'읽어온 내용이 있습니다. 원본과 비교해 확인해주세요.'}</p><button type="button" onClick={()=>setOpen(true)}>읽은 내용 다시 확인</button></>}{open&&candidate&&<AdminPanelDialog title={kind==='funeral'?'부고장 읽은 내용 확인':'청첩장 읽은 내용 확인'} className="notice-review-dialog" fitVisualViewport footer={<button type="button" className="ap-primary" onClick={()=>{const values=noticeFormValues(candidate.fields,kind);const person=candidate.fields.person?.trim();if(person)values.person=person;apply.current(values);setApplied(true);setOpen(false)}}>확인한 정보 입력하기</button>} onClose={()=>setOpen(false)}>{candidate.warnings?.map((v:string,i:number)=><p key={i} className="notice-review-warning" role="alert">{v}</p>)}<p>원본과 비교하고, 바꿀 항목은 이 화면에서 수정해주세요.</p>{candidate.text&&<details className="notice-ocr-text"><summary>사진에서 읽은 글자 확인</summary><pre>{candidate.text}</pre></details>}{keys.map(k=><label className="m-field" key={k}><span>{labels[k]}</span><input aria-label={'읽어온 '+labels[k]} type={k.toLowerCase().includes('date')?'date':k.toLowerCase().includes('time')?'time':'text'} maxLength={300} value={candidate.fields[k]||''} placeholder="읽지 못함 · 직접 입력 가능" onChange={e=>setCandidate((d:any)=>({...d,fields:{...d.fields,[k]:e.target.value}}))}/>{candidate.evidence[k]&&<small>원문: {candidate.evidence[k]}</small>}{current[k]&&current[k]!==candidate.fields[k]&&<small>현재 입력: {current[k]}</small>}</label>)}<p className="help">비워 둔 항목은 기존 입력 내용이 유지됩니다.</p></AdminPanelDialog>}</div>
}
