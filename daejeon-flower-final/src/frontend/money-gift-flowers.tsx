import React,{useEffect,useRef,useState} from 'react';
import {cms,useCMS,gallery,product} from './cms';
import {moneyGiftId,moneyGiftOptions} from './money-gift-data';
import {kakaoLinks} from './kakao-channel';
import {StoreImage} from './store-image';
import {AdminPanelDialog} from './admin-dialog';
import './money-gift-flowers.css';

type Photo={src:string;path?:string};
export function MoneyGiftCarousel({photos,label,onOpen,initialIndex=0,enlarged=false}:{photos:Photo[];label:string;onOpen?:(index:number)=>void;initialIndex?:number;enlarged?:boolean}){
 const [index,setIndex]=useState(Math.min(initialIndex,Math.max(0,photos.length-1))),row=useRef<HTMLDivElement>(null);
 const bounded=(i:number)=>Math.max(0,Math.min(photos.length-1,i));
 const position=(i:number,behavior:ScrollBehavior='smooth')=>{const track=row.current,slide=track?.children[i] as HTMLElement|undefined;if(track&&slide){const first=track.children[0] as HTMLElement;track.scrollTo?.({left:slide.offsetLeft-first.offsetLeft,behavior})}};
 const move=(i:number)=>{const n=bounded(i);setIndex(n);position(n)};
 useEffect(()=>{const n=bounded(initialIndex);setIndex(n);const frame=requestAnimationFrame(()=>position(n,'auto'));return()=>cancelAnimationFrame(frame)},[label,initialIndex]);
 useEffect(()=>{if(index>=photos.length)move(Math.max(0,photos.length-1))},[photos.length]);
 if(!photos.length)return <p className="gallery-empty">제작 예시 사진을 준비하고 있어요.</p>;
 return <div className={'catalog-gallery mg-carousel'+(enlarged?' mg-carousel-enlarged':'')}>
  <div className="gallery-toolbar"><span>{label}</span><div><button type="button" aria-label={`${label} 이전 사진`} disabled={index===0} onClick={()=>move(index-1)}>‹</button><span role="status" aria-live="polite">{index+1} / {photos.length}</span><button type="button" aria-label={`${label} 다음 사진`} disabled={index===photos.length-1} onClick={()=>move(index+1)}>›</button></div></div>
  <div ref={row} className="photo-slider" tabIndex={0} aria-label={`${label} 사진 슬라이드`} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(index+(e.key==='ArrowRight'?1:-1))}}} onScroll={e=>{const track=e.currentTarget,first=track.children[0] as HTMLElement,second=track.children[1] as HTMLElement;const step=second?second.offsetLeft-first.offsetLeft:track.clientWidth;if(step)setIndex(bounded(Math.round(track.scrollLeft/step)))}}>
   {photos.map((im,i)=><figure className="photo-slide" key={im.path||im.src}>{onOpen?<button className="photo mg-photo-open" aria-label={`${label} 사진 ${i+1} 크게 보기`} onClick={()=>onOpen(i)}><StoreImage src={im.src} alt={`${label} 제작 예시 ${i+1}`}/><span className="mg-zoom" aria-hidden="true">＋</span></button>:<div className="photo"><StoreImage src={im.src} alt={`${label} 제작 예시 ${i+1}`} priority={i===index}/></div>}</figure>)}
  </div>
  {photos.length>1&&<><div className="mg-dots" aria-label={`${label} 사진 선택`}>{photos.map((_,i)=><button key={i} aria-label={`${label} ${i+1}번째 사진 보기`} aria-pressed={i===index} onClick={()=>move(i)}/>)}</div><p className="swipe-note">사진을 좌우로 넘겨보세요.</p></>}
 </div>;
}

export function MoneyGiftFlowers(){
 useCMS();
 const [method,setMethod]=useState(''),[container,setContainer]=useState(''),[opened,setOpened]=useState<{code:string;index:number}|null>(null),[selected,setSelected]=useState(''),[copied,setCopied]=useState('');
 const consultRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(selected)consultRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'})},[selected]);
 const item=product(moneyGiftId),variants=item?.variants||[],group=method==='hand'?'hand':method==='arrangement'?container:'';
 const options=moneyGiftOptions.filter(o=>o.group===group&&variants.some((v:any)=>v.size===o.code&&v.active));
 const label=(o:typeof moneyGiftOptions[number])=>{const name=variants.find((v:any)=>v.size===o.code)?.label;return name?.includes(' · ')?name.split(' · ').slice(1).join(' · '):name||o.title};
 const chat=kakaoLinks(cms.settings.kakao).chat;
 const representative=(groups:string[])=>moneyGiftOptions.filter(o=>groups.includes(o.group)&&variants.some((v:any)=>v.size===o.code&&v.active)).flatMap(o=>gallery(moneyGiftId,'',o.code))[0];
 const option=options.find(o=>o.code===selected);
 const path=option?.group==='hand'?'핸드타이드(꽃다발형)':option?.group==='basket'?'어레인지먼트 · 바스켓':'어레인지먼트 · 플라워박스';
 const inquiry=option?`안녕하세요. 돈과 함께 선물하는 꽃 상담을 원해요.\n선택한 구성: ${path} · ${label(option)}\n희망 수령일: \n선물할 용돈 금액·지폐 구성: \n원하는 색감·메시지: `:'';
 async function copyInquiry(){try{await navigator.clipboard.writeText(inquiry);setCopied('상담 내용을 복사했어요. 카카오톡 채팅창에 붙여넣어 주세요.')}catch{setCopied('아래 상담 내용을 길게 눌러 복사해 주세요.')}}
 const consultation=(o:typeof moneyGiftOptions[number])=><button type="button" className="solid-btn kakao-action" aria-label={`${label(o)} 카카오톡에서 상담받기`} onClick={()=>{setOpened(null);setSelected(o.code);setCopied('')}}>카카오톡에서 상담받기</button>;
 const openOption=moneyGiftOptions.find(o=>o.code===opened?.code);
 return <section className="mg-wrap" aria-label="돈과 함께 선물하는 꽃">
  <header className="section-head"><h2>{item?.name||'돈과 함께 선물하는 꽃'}</h2><p className="section-desc">{item?.description}</p></header>
  <div className="category-grid mg-methods" aria-label="제작 방식">
   {[{id:'hand',title:'핸드타이드',subtitle:'꽃다발형',description:'손에 들고 선물할 수 있도록 꽃을 한 다발로 묶어 포장해요.',groups:['hand']},{id:'arrangement',title:'어레인지먼트',subtitle:'바구니·박스형',description:'바구니나 상자 안에 꽃을 꽂아, 그대로 놓고 감상할 수 있어요.',groups:['basket','box']}].map(m=>{const image=representative(m.groups);return <button className="product-card" key={m.id} aria-pressed={method===m.id} onClick={()=>{setMethod(m.id);setContainer('');setSelected('');setCopied('')}}><div className="photo">{image?<StoreImage src={image.src} alt={m.title+' '+m.subtitle+' 제작 예시'}/>:<span className="photo-label">사진 준비 중</span>}</div><div className="product-name">{m.title} <span>{m.subtitle}</span></div><p className="product-meta">{m.description}</p></button>})}
  </div>
  {method==='arrangement'&&<div className="category-grid mg-containers" aria-label="담는 형태">{[['basket','바스켓'],['box','플라워박스']].map(([code,name])=>{const image=representative([code]);return <button className="product-card" key={code} aria-pressed={container===code} onClick={()=>{setContainer(code);setSelected('');setCopied('')}}><div className="photo landscape">{image?<StoreImage src={image.src} alt={name+' 제작 예시'}/>:<span>사진 준비 중</span>}</div><div className="product-name">{name}</div></button>})}</div>}
  {!!group&&<div className="mg-options">{options.length===0?<p className="gallery-empty">이 구성의 사진을 준비하고 있어요. 카카오톡으로 문의해주세요.</p>:options.map(o=><article className="section compact mg-option" key={o.code}>
   <header className="section-head"><h3>{label(o)}</h3><p className="section-desc">{o.description}</p></header>
   <MoneyGiftCarousel photos={gallery(moneyGiftId,'',o.code)} label={label(o)} onOpen={index=>setOpened({code:o.code,index})}/>
   {o.code==='BASKET_MONEY'&&<p className="help mg-edited-note">돈꽃 배치를 보여주기 위해 편집한 예시 이미지입니다.</p>}
   {consultation(o)}
  </article>)}</div>}
  {option&&<section ref={consultRef} className="mg-consult section compact" aria-label="선택한 구성 상담"><header className="section-head"><h3>{path} · {label(option)}</h3><p className="section-desc">상담 내용을 복사한 뒤 카카오톡 채팅창에 붙여넣어 주세요.</p></header><textarea aria-label="카카오톡에 보낼 상담 내용" readOnly rows={6} value={inquiry}/><button type="button" className="soft-btn" onClick={copyInquiry}>상담 내용 복사</button>{chat?<a className="solid-btn kakao-action" href={chat} target="_blank" rel="noopener noreferrer">카카오톡 상담 열기</a>:<p className="help">상담 연결을 준비하고 있어요.</p>}<p className="help" role="status">{copied}</p></section>}
  {opened&&openOption&&<AdminPanelDialog title={label(openOption)} className="sp-lightbox mg-lightbox" onClose={()=>setOpened(null)}><MoneyGiftCarousel photos={gallery(moneyGiftId,'',openOption.code)} label={label(openOption)} initialIndex={opened.index} enlarged/>{consultation(openOption)}</AdminPanelDialog>}
 </section>;
}
