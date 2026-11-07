import React,{useEffect,useState} from 'react';
const states:any={AVAILABLE:'사용 가능',RESERVED:'결제 준비 중',VERIFYING:'결제 확인 중',USED:'사용 완료',EXPIRED:'기간 만료'};
export function AnniversaryCouponWallet(){const [data,setData]=useState<any>(null),[error,setError]=useState('');
 const load=async()=>{try{const r=await fetch('/api/anniversaries/coupons',{credentials:'same-origin'});if(!r.ok)throw Error();setData(await r.json());setError('')}catch{setError('쿠폰을 불러오지 못했습니다. 다시 확인해주세요.')}};useEffect(()=>{load()},[]);
 if(!data&&!error||data&&!data.ready&&!data.rows.length)return null;
 return <section className="mp-section coupon-wallet"><header><h2>내 기념일 쿠폰</h2><button className="mp-link" onClick={load}>새로고침</button></header>{data?.rows.map((c:any)=><article className={'coupon-wallet-card '+(c.status==='AVAILABLE'?' available':'')} key={c.id}><span>{states[c.status]||c.status}</span><strong>2,000<small>원 할인</small></strong><b>{c.label}</b><p>{c.expires_date}까지</p></article>)}{data&&!data.rows.length&&<p>기념일 3일 전부터 쿠폰이 발급됩니다.</p>}<p className="mp-fine">등록한 주문자 연락처로 주문 시 1장 사용 · 배송비 제외 · 중복 할인 불가<br/>같은 날짜의 기념일은 한 해에 1장 발급됩니다.</p>{error&&<p role="alert">{error}</p>}</section>;
}
