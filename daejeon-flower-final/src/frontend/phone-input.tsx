import {DateInput} from './korean-calendar';
'use client';
import React,{useLayoutEffect,useRef} from 'react';
export function phoneDigits(value:string){let digits=value.replace(/\D/g,'');if(/^\s*\+82/.test(value)){digits=digits.slice(2);if(!digits.startsWith('0'))digits='0'+digits}return digits.slice(0,11)}
export function formatPhone(value:string){const d=phoneDigits(value);if(!d)return '';const first=d.startsWith('02')?2:3;const middle=d.startsWith('010')?4:d.startsWith('02')?(d.length>9?4:3):(d.length>10?4:3);if(d.length<first)return d;let result=d.slice(0,first)+'-';const rest=d.slice(first);if(rest.length<middle)return result+rest;return result+rest.slice(0,middle)+'-'+rest.slice(middle)}
export function PhoneInput({telephone=true,value='',onChange,inputMode,autoComplete,type,maxLength,...props}:React.InputHTMLAttributes<HTMLInputElement>&{telephone?:boolean}){
 const ref=useRef<HTMLInputElement>(null),caret=useRef<number|null>(null);const displayed=telephone?formatPhone(String(value)):value;
 useLayoutEffect(()=>{if(caret.current!==null&&ref.current&&document.activeElement===ref.current){ref.current.setSelectionRange(caret.current,caret.current);caret.current=null}},[displayed]);
 if(!telephone&&(type==='date'||type==='month'))return <DateInput {...props} type={type} value={value} onChange={onChange}/>;
 return <input {...props} ref={ref} value={displayed} type={telephone?'tel':type} inputMode={telephone?'numeric':inputMode} autoComplete={telephone?(autoComplete==='off'?'off':autoComplete||'tel'):autoComplete} maxLength={telephone?undefined:maxLength} onChange={e=>{
  if(!telephone){onChange?.(e);return}
  const input=e.currentTarget,raw=input.value,start=input.selectionStart??raw.length;let digits=phoneDigits(raw),count=phoneDigits(raw.slice(0,start)).length;
  const inputType=(e.nativeEvent as InputEvent).inputType||'';
  if(inputType==='deleteContentBackward'&&digits===phoneDigits(String(value))&&count>0){digits=digits.slice(0,count-1)+digits.slice(count);count--}
  if(inputType==='deleteContentForward'&&digits===phoneDigits(String(value))&&count<digits.length)digits=digits.slice(0,count)+digits.slice(count+1);
  const formatted=formatPhone(digits);let pos=0,seen=0;while(pos<formatted.length&&seen<count){if(/\d/.test(formatted[pos]))seen++;pos++}if(formatted[pos]==='-')pos++;
  input.value=formatted;caret.current=pos;input.setSelectionRange(pos,pos);onChange?.(e);
 }}/>;
}
