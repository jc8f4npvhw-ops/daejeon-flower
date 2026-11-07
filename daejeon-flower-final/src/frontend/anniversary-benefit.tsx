import React from 'react';
export function AnniversaryBenefit({available=false,preview=false}:{available?:boolean;preview?:boolean}){
 if(!available&&!preview)return null;
 return <aside className="anniversary-benefit" aria-label="기념일 등록 혜택"><span className="anniversary-benefit-icon" aria-hidden="true">✦</span><div><small>소중한 날을 등록하면</small><strong>기념일마다 <em>2,000원</em></strong><p>매년 등록한 기념일에 맞춰<br/>할인쿠폰을 발급해드려요.</p><small>기념일 3일 전 발급 · 한 주문에 한 장</small></div></aside>;
}
