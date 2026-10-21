import React from 'react';

export function ReminderExample({name='엄마 생신',date='10월 22일',memo='',gift='분홍빛 꽃다발 · 예산 5만원',onGift,onShop}:{
 name?:string;date?:string;memo?:string;gift?:string;onGift?:()=>void;onShop?:()=>void;
}){
 return <section className="mp-message-example" aria-label="기념일 알림 예시">
  <header><span>talk</span><b>대전꽃백화점</b><small>알림 예시</small></header>
  <div className="mp-message-bubble"><small>소중한 날까지 D–3</small><b>{name}이 3일 남았어요.</b><p>{date}, 마음을 전할 준비를 해볼까요?</p>{gift&&<p className="mp-example-gift">지난 선물 · {gift}</p>}{memo&&<p>기억해둔 메모 · {memo}</p>}
  {(onGift||onShop)&&<div className="mp-example-actions">{onGift&&<button type="button" onClick={onGift}>지난 선물 보기</button>}{onShop&&<button type="button" onClick={onShop}>이번 선물 고르기</button>}</div>}</div>
  <p className="mp-fine">화면 이해를 위한 예시입니다. 실제 발송과 주문 내역 연동은 연결 후 제공됩니다.</p>
 </section>;
}

export function AnniversaryOffer({onStart,onDismiss}: {onStart:()=>void;onDismiss:()=>void}){
 return <section className="mp-anniversary-offer">
  <span className="mp-eyebrow">A DAY TO REMEMBER</span>
  <h2>다음에도 이 날을<br/>챙겨드릴까요?</h2>
  <p>소중한 날짜 하나만 남겨주세요.<br/>원하시면 3일 전 카카오 알림도 신청할 수 있어요.</p>
  <ReminderExample/>
  <button className="mp-btn" onClick={onStart}>기억할 날짜 하나 남기기</button>
  <button className="mp-link" onClick={onDismiss}>지금은 괜찮아요</button>
  <small>기념일 등록은 선택이에요. 나중에 마이페이지에서도 등록할 수 있어요.</small>
 </section>;
}
