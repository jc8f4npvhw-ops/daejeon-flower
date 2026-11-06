import {test} from 'node:test';import assert from 'node:assert/strict';import{build}from'esbuild';import{JSDOM}from'jsdom';
test('admin photos paginate 25 newest first and reset for a new category',async(t)=>{
 const bundle=await build({stdin:{contents:`import React,{useState,useEffect}from'react';import{createRoot}from'react-dom/client';import{AdminPhotoGrid}from'./src/frontend/admin-photo-controls';function App(){useEffect(()=>{window.ready=true},[]);const[n,setN]=useState(52);return <><button onClick={()=>setN(3)}>change</button><AdminPhotoGrid resetKey={n}>{Array.from({length:n},(_,i)=><article key={i}>photo-{i+1}</article>).reverse()}</AdminPhotoGrid></>}createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife'});
 const dom=new JSDOM('<div id="root"></div>',{runScripts:'outside-only'});t.after(()=>dom.window.close());const d=dom.window.document;
 const until=async(check:()=>boolean)=>{const limit=Date.now()+5000;while(!check()&&Date.now()<limit)await new Promise(r=>setTimeout(r,25));assert(check(),'UI did not settle')};
 dom.window.eval(bundle.outputFiles[0].text);await until(()=>(dom.window as any).ready===true);
 const photos=()=>[...d.querySelectorAll('article')].map(x=>x.textContent),next=()=>[...d.querySelectorAll('button')].find(b=>b.textContent==='다음')!;
 assert.equal(photos().length,25);assert.equal(photos()[0],'photo-52');next().click();await until(()=>photos()[0]==='photo-27');assert.equal(photos().length,25);
 next().click();await until(()=>photos()[0]==='photo-2');assert.deepEqual(photos(),['photo-2','photo-1']);assert(next().disabled);
 d.querySelector('button')!.click();await until(()=>photos().length===3);assert.deepEqual(photos(),['photo-3','photo-2','photo-1']);assert(d.body.textContent?.includes('1 / 1 페이지'));
});
