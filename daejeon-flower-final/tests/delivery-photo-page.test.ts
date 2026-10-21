import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

test('customer delivery page exchanges the fragment once under StrictMode and renders photos without exposing token links',async()=>{
 const bundle=await build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Page from './src/frontend/delivery-photo-page';createRoot(document.getElementById('root')).render(<React.StrictMode><Page/></React.StrictMode>);",loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
 const raw='a'.repeat(64),dom=new JSDOM('<div id="root"></div>',{url:'https://store.example/delivery?order=DF_TEST#access='+raw,runScripts:'outside-only',pretendToBeVisual:true});
 try{let exchanges=0,reads=0;
  dom.window.fetch=async(input:any,init:any)=>{
   assert.equal(dom.window.location.hash,'');
   if(String(input).endsWith('/session')){exchanges++;assert.equal(JSON.parse(init.body).token,raw);await new Promise(r=>setTimeout(r,15));return new Response('{"ok":true}');}
   reads++;assert.equal(exchanges,1);return new Response(JSON.stringify({orderNo:'DF_TEST',completedAt:'2026-10-21 06:00:00',products:['꽃다발 M'],photos:[{id:1,src:'/api/delivery/DF_TEST/photos/1'}]}));
  };
  dom.window.eval(bundle.outputFiles[0].text);
  for(let i=0;i<100&&!dom.window.document.querySelector('img');i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(exchanges,1);assert(reads>=1);assert(dom.window.document.body.textContent!.includes('꽃다발 M'));
  assert.equal(dom.window.document.querySelector('img')!.getAttribute('src'),'/api/delivery/DF_TEST/photos/1');
  assert(!dom.window.document.body.innerHTML.includes(raw));assert(!dom.window.location.href.includes(raw));
 }finally{dom.window.close()}
});
