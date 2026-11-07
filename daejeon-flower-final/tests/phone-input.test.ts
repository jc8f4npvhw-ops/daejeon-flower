import {test} from 'node:test';import assert from 'node:assert/strict';import {formatPhone,phoneDigits} from '../src/frontend/phone-input';import {build} from 'esbuild';import {JSDOM} from 'jsdom';
test('mobile separators appear immediately and pasted numbers normalize without losing digits',()=>{assert.equal(formatPhone('0'),'0');assert.equal(formatPhone('010'),'010-');assert.equal(formatPhone('0101234'),'010-1234-');assert.equal(formatPhone('01012345678'),'010-1234-5678');assert.equal(formatPhone('+82 10-1234-5678'),'010-1234-5678');assert.equal(formatPhone('010abc12345678'),'010-1234-5678');assert.equal(phoneDigits('010-1234-5678'),'01012345678');assert.equal(formatPhone('0421234567'),'042-123-4567');assert.equal(formatPhone('0212345678'),'02-1234-5678')});
test('phone field requests numeric keypad, handles paste, separator deletion and middle edits with caret preserved',async()=>{
 const b=await build({stdin:{contents:"import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {PhoneInput} from './src/frontend/phone-input';function App(){const [v,setV]=useState('');return <PhoneInput aria-label='연락처' value={v} onChange={e=>{setV(e.target.value);window.saved=e.target.value}}/>}createRoot(document.getElementById('root')).render(<App/>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
 const dom=new JSDOM('<div id="root"></div>',{url:'https://store.example',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window as any;try{w.eval(b.outputFiles[0].text);const wait=()=>new Promise(r=>setTimeout(r,25));for(let i=0;i<20&&!w.document.querySelector('input');i++)await wait();const input=w.document.querySelector('input'),set=Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value')!.set!;assert.equal(input.type,'tel');assert.equal(input.inputMode,'numeric');assert.equal(input.autocomplete,'tel');input.focus();
 const edit=async(value:string,pos=value.length,inputType='insertText')=>{set.call(input,value);input.setSelectionRange(pos,pos);input.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType}));await wait()};
 await edit('010');assert.equal(input.value,'010-');assert.equal(input.selectionStart,4);
 await edit('010-1234');assert.equal(input.value,'010-1234-');assert.equal(input.selectionStart,9);
 await edit('010-1234-5678');assert.equal(w.saved,'010-1234-5678');
 await edit('010-1234');await edit('010-1234',8,'deleteContentBackward');assert.equal(input.value,'010-123');
 await edit('+82 10-1234-5678',16,'insertFromPaste');assert.equal(input.value,'010-1234-5678');
 await edit('010-9234-5678',5);assert.equal(input.selectionStart,5);assert.equal(input.value,'010-9234-5678');
 await edit('010');await edit('010',3,'deleteContentBackward');assert.equal(input.value,'01');
 }finally{w.close()}
});
