import React,{useEffect,useRef,useState} from 'react';
import {cms,useCMS,gallery,product} from './cms';
import {moneyGiftId,moneyGiftOptions} from './money-gift-data';
import {kakaoLinks} from './kakao-channel';
import {StoreImage} from './store-image';
import './money-gift-flowers.css';

export function MoneyGiftFlowers(){
 useCMS();
 const [method,setMethod]=useState(''),[container,setContainer]=useState(''),[selected,setSelected]=useState(''),[photo,setPhoto]=useState<string|null>(null),[copied,setCopied]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(photo){dialog.current?.showModal();const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before}}},[photo]);
 useEffect(()=>{if(selected)document.querySelector('.mg-consult')?.scrollIntoView?.({behavior:'smooth',block:'start'})},[selected]);
 useEffect(()=>{if(!photo)return;const el=dialog.current?.querySelector('button');el?.focus()},[photo]);
 const item=product(moneyGiftId),variants=item?.variants||[],group=method==='hand'?'hand':container;
 const options=moneyGiftOptions.filter(o=>o.group===group&&variants.some((v:any)=>v.size===o.code&&v.active));
 const option=options.find(o=>o.code===selected);
 const label=(o:typeof moneyGiftOptions[number])=>variants.find((v:any)=>v.size===o.code)?.label?.split(' · ').slice(1).join(' · ')||o.title;
 const path=method==='hand'?'핸드타이드(꽃다발형)':container==='basket'?'어레인지먼트 · 바스켓':'어레인지먼트 · 플라워박스';
 const inquiry=option?`안녕하세요. 돈과 함께 선물하는 꽃 상담을 원해요.\n선택한 구성: ${path} · ${label(option)}\n희망 수령일: \n희망 꽃 예산: \n선물할 용돈 금액·지폐 구성: \n원하는 색감·메시지: `:'';
 const chat=kakaoLinks(cms.settings.kakao).chat;
 async function copyInquiry(){try{await navigator.clipboard.writeText(inquiry);setCopied('상담 내용을 복사했어요. 카카오톡 채팅창에 붙여넣어 주세요.')}catch{setCopied('아래 상담 내용을 길게 눌러 복사해 주세요.')}}
 return <section className="mg-wrap" aria-label="돈과 함께 선물하는 꽃">
  <header className="mg-intro"><h2>{item?.name||'돈과 함께 선물하는 꽃'}</h2><p>{item?.description}</p><p>꽃의 양과 크기, 용돈 구성에 따라 제작 방법이 달라져요. 원하는 모습을 고른 뒤 상담으로 함께 정해요.</p></header>
  <div className="mg-methods" aria-label="제작 방식">
   <button aria-pressed={method==='hand'} onClick={()=>{setMethod('hand');setSelected('');setCopied('')}}><strong>핸드타이드 <span>꽃다발형</span></strong><p>손에 들고 선물할 수 있도록 꽃을 한 다발로 묶어 포장해요.</p></button>
   <button aria-pressed={method==='arrangement'} onClick={()=>{setMethod('arrangement');setSelected('');setCopied('')}}><strong>어레인지먼트 <span>바구니·박스형</span></strong><p>바구니나 상자 안에 꽃을 꽂아, 그대로 놓고 감상할 수 있어요.</p></button>
  </div>
  {method==='arrangement'&&<div className="mg-containers" aria-label="담는 형태">{[['basket','바스켓'],['box','플라워박스']].map(([code,name])=><button key={code} aria-pressed={container===code} onClick={()=>{setContainer(code);setSelected('');setCopied('')}}>{name}</button>)}</div>}
  {!!group&&<div className="mg-options">{options.length===0?<p>이 구성의 사진을 준비하고 있어요. 카카오톡으로 문의해주세요.</p>:options.map(o=>{const photos=gallery(moneyGiftId,'',o.code);return <article className="mg-option" key={o.code}>
   <h3>{label(o)}</h3><p>{o.description}</p>
   {photos.length>0?<div className="mg-gallery" aria-label={`${label(o)} 제작 예시`}>{photos.map((im:any,i:number)=><button className="mg-photo" key={im.path||im.src} aria-label={`${label(o)} 사진 ${i+1} 크게 보기`} onClick={()=>setPhoto(im.src)}><StoreImage src={im.src} alt={`${label(o)} 제작 예시 ${i+1}`}/></button>)}</div>:<p>제작 예시 사진을 준비하고 있어요.</p>}
   {o.code==='BASKET_MONEY'&&<small>돈꽃 배치를 보여주기 위해 편집한 예시 이미지입니다.</small>}
   <button className="mg-select" aria-pressed={selected===o.code} onClick={()=>{setSelected(o.code);setCopied('')}}>{selected===o.code?'상담할 구성으로 선택됨':'이 구성으로 상담하기'}</button>
  </article>})}</div>}
  {option&&<section className="mg-consult" aria-label="선택한 구성 상담"><h3>{path} · {label(option)}</h3><p>꽃 예산과 선물할 용돈 구성을 상담으로 확인한 뒤 제작해 드려요.</p><textarea aria-label="카카오톡에 보낼 상담 내용" readOnly rows={7} value={inquiry}/><button onClick={copyInquiry}>상담 내용 복사</button>{chat?<a className="mg-kakao" href={chat} target="_blank" rel="noopener noreferrer">카카오톡 상담 열기</a>:<p>상담 연결을 준비 중입니다. 매장으로 문의해주세요.</p>}<p role="status">{copied||'상담 내용을 복사해 채팅창에 붙여넣으면 선택한 구성을 함께 전달할 수 있어요.'}</p></section>}
  {photo&&<dialog ref={dialog} className="mg-lightbox" aria-label="제작 사진 크게 보기" onCancel={()=>setPhoto(null)} onClick={e=>{if(e.target===e.currentTarget)setPhoto(null)}}><button autoFocus onClick={()=>setPhoto(null)} aria-label="사진 닫기">닫기</button><img src={photo} alt="선택한 제작 예시 확대 사진"/></dialog>}
 </section>;
}
