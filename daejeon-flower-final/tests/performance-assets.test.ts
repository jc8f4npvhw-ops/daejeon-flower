import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM,VirtualConsole} from 'jsdom';
import {StoreImage} from '../src/frontend/store-image';import {optimizedMedia} from '../src/frontend/optimized-media';
import {startPublicContentLoad,consumePublicContent} from '../src/frontend/public-content-request';
test('small product previews have responsive derivatives; unknown uploads retain their source; expanded photos have priority',()=>{
 const source=Object.keys(optimizedMedia)[0];const output=renderToStaticMarkup(React.createElement(StoreImage,{src:source,alt:'상품',sizes:'110px'}));
 assert(output.includes('srcSet="/optimized-media/'));assert(output.includes('loading="lazy"'));assert(output.includes('sizes="110px"'));assert(output.includes(source));
 const expanded=renderToStaticMarkup(React.createElement(StoreImage,{src:source,priority:true}));assert(expanded.includes('fetchPriority="high"'));assert(expanded.includes('loading="eager"'));
 const uploaded=renderToStaticMarkup(React.createElement(StoreImage,{src:'/api/media/public/uploads/example.webp'}));assert(!uploaded.includes('srcSet'));assert(uploaded.includes('/uploads/example.webp'));
 for(const versions of Object.values(optimizedMedia))for(const image of versions){assert(fs.existsSync('public'+image.src));assert(fs.statSync('public'+image.src).size>32)}
});
test('entry request and CMS share one public snapshot; future loads fetch current data, including after failures',async()=>{
 const original=globalThis.fetch;let calls=0;let reject=false;
 globalThis.fetch=async()=>{calls++;if(reject)throw Error('offline');return new Response(JSON.stringify({revision:calls}),{headers:{'Content-Type':'application/json'}})};
 try{const early=startPublicContentLoad('/api');const data=await consumePublicContent('/api');assert.equal(await early,data);assert.equal(calls,1);assert.equal((await consumePublicContent('/api')).revision,2);reject=true;await assert.rejects(consumePublicContent('/api'));reject=false;assert.equal((await consumePublicContent('/api')).revision,4)}finally{globalThis.fetch=original}
});
test('externalized care guide retains nine plants, direct entry, all four tabs and water dialog',async(t)=>{
 const html=fs.readFileSync('public/plant-care.html','utf8');assert(Buffer.byteLength(html)<300000);assert(!html.includes('data:font/'));assert(!/data:image\/(webp|jpeg|png);base64/.test(html));
 const errors:string[]=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'https://preview.test/plant-care.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.matchMedia=(()=>({matches:false})) as any;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}}});t.after(()=>dom.window.close());
 const {document:d}=dom.window;assert.equal(d.querySelectorAll('#plant-grid a').length,9);for(const image of d.querySelectorAll<HTMLImageElement>('#plant-grid img')){assert.equal(image.loading,'lazy');if(image.src.includes('/care-assets/')){assert(image.src.endsWith('-320.webp'));assert(fs.existsSync('public'+new URL(image.src).pathname))}}
 for(const a of [...d.querySelectorAll<HTMLAnchorElement>('#plant-grid a')]){dom.window.location.hash=a.hash;dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));assert(d.querySelector('.pg-header'));assert.equal(d.querySelectorAll('[data-care]').length,4);for(const kind of ['water','sun','temp','story']){(d.querySelector('[data-care="'+kind+'"]') as HTMLElement).click();assert.equal(d.querySelector('[data-care="'+kind+'"]')?.getAttribute('aria-pressed'),'true');if(kind==='water'){(d.querySelector('[data-open="water"]') as HTMLElement).click();assert(d.querySelector('dialog[open]'));(d.querySelector('dialog[open]') as HTMLDialogElement).close()}}}
 assert.equal(errors.length,0,errors.join('\n'));
});
