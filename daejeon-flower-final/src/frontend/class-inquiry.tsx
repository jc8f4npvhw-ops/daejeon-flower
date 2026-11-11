import {DateInput,koreanToday} from './korean-calendar';
import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
async function copyInquiry(message:string){
 try{
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);return true}
 }catch{/* Try the browser's selection-based copy below. */}
 const field=document.createElement('textarea'),focused=document.activeElement;
 field.value=message;field.readOnly=true;
 field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
 document.body.appendChild(field);
 try{field.focus({preventScroll:true});field.select();field.setSelectionRange(0,message.length);return document.execCommand('copy')===true}
 catch{return false}
 finally{field.remove();if(focused instanceof HTMLElement)focused.focus({preventScroll:true})}
}

export function ClassInquiryFrame({html,channel}: {html:string;channel:string}){
 const frame=useRef<HTMLIFrameElement>(null),dialog=useRef<HTMLDivElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 const [height,setHeight]=useState(3500),[text,setText]=useState(''),[status,setStatus]=useState(''),[copyFailed,setCopyFailed]=useState(false),[sending,setSending]=useState(false);
 const [dateHost,setDateHost]=useState<HTMLElement|null>(null),[classDate,setClassDate]=useState(''),[dateDisabled,setDateDisabled]=useState(false);
 useEffect(()=>{if(!dateHost)return;const raw=frame.current?.contentDocument?.getElementById('date') as HTMLInputElement;if(!raw)return;const sync=()=>{setDateDisabled(raw.disabled);setClassDate(raw.value)};const observer=new MutationObserver(sync);observer.observe(raw,{attributes:true});raw.addEventListener('change',sync);sync();return()=>{observer.disconnect();raw.removeEventListener('change',sync)}},[dateHost]);
 const validChannel=/^https:\/\//.test(channel||'');
 useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source!==frame.current?.contentWindow)return;if(e.data?.type==='class-height'&&Number.isFinite(e.data.height))setHeight(Math.min(30000,Math.max(500,e.data.height)));if(e.data?.type==='class-inquiry-preview'&&typeof e.data.text==='string'&&e.data.text.length<=6000){returnFocus.current=frame.current?.contentDocument?.activeElement as HTMLElement;setText(e.data.text);setStatus('');setCopyFailed(false)}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[]);
 const close=()=>{if(!sending)setText('')};
 useEffect(()=>{if(!text)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});const keys=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!dialog.current?.querySelector('.kakao-action:disabled'))setText('');if(e.key==='Tab'){const items=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],textarea')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',keys);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keys);returnFocus.current?.focus({preventScroll:true})}},[text]);
 async function send(){
  if(!validChannel||sending)return;
  setStatus('');setSending(true);
  try{
   if(await copyInquiry('[대전꽃백화점 클래스 문의]\n'+text)){
    window.location.assign(channel);
    return;
   }
   setCopyFailed(true);
   setStatus('이 브라우저에서 자동 복사를 허용하지 않았어요. 문의 내용을 길게 눌러 복사한 뒤 카카오톡 상담창을 열어주세요.');
  }catch{
   setCopyFailed(true);
   setStatus('카카오톡으로 이동하지 못했어요. 아래 상담창 링크를 눌러주세요.');
  }finally{setSending(false)}
 }

 return <><iframe ref={frame} title="플라워 클래스 예시" className="class-frame" style={{height}} srcDoc={html} onLoad={()=>{const doc=frame.current?.contentDocument,raw=doc?.getElementById('date') as HTMLInputElement;if(raw&&doc){raw.type='hidden';const host=doc.createElement('span');raw.parentNode?.insertBefore(host,raw);setDateHost(host);setClassDate(raw.value);setDateDisabled(raw.disabled)}}}/>{dateHost&&createPortal(<DateInput aria-label="클래스 희망 날짜" min={koreanToday()} value={classDate} disabled={dateDisabled} onChange={e=>{setClassDate(e.target.value);const raw=frame.current?.contentDocument?.getElementById('date') as HTMLInputElement;if(raw){raw.value=e.target.value;raw.dispatchEvent(new Event('input',{bubbles:true}));raw.dispatchEvent(new Event('change',{bubbles:true}))}}}/>,dateHost)}{text&&createPortal(<div className="class-inquiry-overlay" onClick={close}><div className="class-inquiry-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="class-inquiry-title" onClick={e=>e.stopPropagation()}><header><div><small>FLOWER CLASS</small><h2 id="class-inquiry-title">문의 내용 미리보기</h2></div><button type="button" aria-label="문의 미리보기 닫기" onClick={close}>×</button></header><div className="class-inquiry-body"><p>아래 내용을 확인하고 카카오톡으로 전달해주세요.</p><pre>{text}</pre>{copyFailed&&<label>직접 복사할 문의 내용<textarea readOnly value={'[대전꽃백화점 클래스 문의]\n'+text} onFocus={e=>e.target.select()}/></label>}<p className="help">버튼을 누르면 내용이 복사되고 상담창이 열립니다. 대화창에 붙여넣은 뒤 전송해주세요.</p><p role="status">{status}</p></div><footer><button className="solid-btn kakao-action" disabled={!validChannel||sending} onClick={send}>{sending?'카카오톡으로 이동 중…':validChannel?'문의 내용 복사하고 카카오톡 열기 →':'카카오톡 채널 연결 준비 중'}</button>{copyFailed&&validChannel&&<a className="soft-btn kakao-action" href={channel}>카카오톡 상담창 열기 ↗</a>}<button className="text-link" onClick={close}>내용 수정하기</button></footer></div></div>,document.body)}</>
}
