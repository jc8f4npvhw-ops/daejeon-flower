import {AnniversaryChoice,newAnniversaryDraft,anniversaryTitle,draftReady} from './anniversary-choice';
import React,{useRef,useState} from 'react';
import {KakaoFriendButton} from './kakao-friend-button';
export type CompletedPayment={orderNo:string;orderName?:string;orderStyle?:string|null;orderVariant?:string|null;fulfillmentType?:string;fulfillmentAt?:string|null;amount:number;anniversary?:{couponReady:boolean;validDays:number;channelUrl:string;policyVersion:string}};
function receiptDate(value?:string|null){
 const date=value?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
 if(!date)return null;
 const scheduled=new Date(date[1]+'T'+date[2]+':00+09:00');
 if(!Number.isFinite(scheduled.getTime()))return null;
 const timeZone='Asia/Seoul';
 return {date:new Intl.DateTimeFormat('ko-KR',{timeZone,year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(scheduled),time:new Intl.DateTimeFormat('ko-KR',{timeZone,hour:'numeric',minute:'2-digit',hour12:true}).format(scheduled)};
}
const newRequest=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
export async function paymentRegistrationRequest(path:string,method='POST',body?:any,csrf?:string){const r=await fetch('/api'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const data:any=await r.json();if(!r.ok)throw Error(data.message||'처리하지 못했습니다. 잠시 후 다시 시도해주세요.');return data}
export function PaymentSuccess({payment,access,request=paymentRegistrationRequest}:{payment:CompletedPayment;access:{orderId:string;token:string};request?:typeof paymentRegistrationRequest}){
 const [open,setOpen]=useState(false),[info,setInfo]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [draft,setDraft]=useState(newAnniversaryDraft);const name=anniversaryTitle(draft),{month,day}=draft;const [remind,setRemind]=useState(false),[marketing,setMarketing]=useState(false);const requestId=useRef(newRequest());
 const friend=!!info?.preferences?.channel_friend;
 const benefit=payment.anniversary?.couponReady===true;
 const start=async()=>{if(busy)return;setBusy(true);setError('');try{const result=await request('/payments/anniversary-session','POST',access);setInfo(result);setMarketing(!!result.preferences?.marketing);if(!info)setDraft(newAnniversaryDraft());setOpen(true)}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(busy||!info||!draftReady(draft))return;setBusy(true);setError('');try{
  // Leave existing preferences alone unless marketing was explicitly changed.
  if(marketing!==!!info.preferences?.marketing)await request('/anniversaries/consent','PUT',{marketing,channelFriend:friend,policyVersion:info.policyVersion},info.csrf);
  await request('/anniversaries','POST',{...draft,label:name,month,day,notify:remind,fromPayment:true,requestId:requestId.current},info.csrf);setSaved(true);setOpen(false);
 }catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const schedule=receiptDate(payment.fulfillmentAt),delivery=payment.fulfillmentType==='DELIVERY';
 const options=[payment.orderStyle,payment.orderVariant].filter(Boolean).join(' · ');
 return <section className="payment-success">
 <header className="payment-success-heading">
  <div className="payment-success-brand">대전꽃백화점</div>
  <span className="payment-success-check" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="m9 16 5 5 9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
  <h1>주문이 확정되었어요.</h1><p>결제를 완료했습니다. 정성껏 준비할게요.</p>
 </header>
 <section className="payment-order-card" aria-label="주문 상세">
  <div className="payment-order-product"><span>주문 상품</span><h2>{payment.orderName||'주문 상품 정보'}</h2>{options&&<p>{options}</p>}</div>
  {payment.fulfillmentType&&<div className="payment-order-schedule"><span>{delivery?'배송 예정 일시':'매장 픽업 일시'}</span>{schedule?<><strong>{schedule.date}</strong><p>{schedule.time}</p></>:<strong>{delivery?'일정은 매장에 문의해주세요':'픽업 일정은 매장에 문의해주세요'}</strong>}</div>}
  <dl className="payment-success-receipt"><div><dt>결제 금액</dt><dd><b>{Number(payment.amount).toLocaleString('ko-KR')}원</b></dd></div><div><dt>주문번호</dt><dd>{payment.orderNo}</dd></div></dl>
 </section>
 <section className="payment-moment-invite" aria-label="결제 후 기념일 등록"><h2>기념일을 남겨둘까요?</h2>{benefit?<><p>기념일을 등록해두시면<br/>다음 기념일부터 <strong>3일 전,</strong></p><div className="payment-coupon-amount"><span>매년 기념일 할인쿠폰</span><strong>2,000<small>원</small></strong></div><p>등록한 날짜에 맞춰 쿠폰을 발급해드려요.</p></>:<p>소중한 날짜를 남겨두고<br/>원하시면 3일 전 카카오 알림도 신청하세요.</p>}
 {saved?<div role="status" className="payment-moment-saved"><strong>기념일을 기억해둘게요 ✓</strong><p>{name} · 매년 {month}월 {day}일</p><p>{remind&&marketing&&friend?'3일 전 카카오 알림도 신청했습니다.':'기념일을 저장했습니다. 카카오 알림은 선택 사항이에요.'}</p><a href="/?moments=1">내 기념일 관리하기 →</a></div>:open?<form className="payment-moment-form" onSubmit={save}><p className="mp-fine">기념일은 오늘 날짜로 채워져 있어요. 다른 날이라면 날짜를 눌러 바꿔주세요. 사귄 날은 처음 만난 날짜를 선택해주세요.</p><AnniversaryChoice value={draft} onChange={setDraft} disabled={busy}/>{draftReady(draft)&&<><div className="mp-consents"><label><input type="checkbox" checked={remind} onChange={e=>setRemind(e.target.checked)}/> [선택] 기념일 3일 전 카카오 알림 신청</label><label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> [선택] 기념일·상품 안내 등 광고성 카카오 메시지 수신동의</label><KakaoFriendButton url={info.channelUrl}/></div><details className="payment-moment-terms"><summary>기념일 등록·쿠폰 안내</summary><p>기념일 등록과 알림 신청은 선택이며 주문 완료에 영향을 주지 않습니다. 기념일 정보는 안내와 쿠폰 발급에 이용하며 관리 화면에서 수정·삭제하거나 수신동의를 철회할 수 있습니다. 쿠폰은 광고 수신동의 없이도 받을 수 있습니다.</p>{benefit&&<p>다음 기념일의 3일 전 발급 · 기념일 후 {info.validDays}일까지 사용 · 주문당 1장 · 배송비 제외. 이미 3일 전이 지난 기념일은 다음 해부터 적용됩니다.</p>}</details><button className="mp-btn" disabled={busy||!draftReady(draft)}>{busy?'저장 중…':'기념일 등록하기'}</button></>}<button type="button" className="mp-link" disabled={busy} onClick={()=>setOpen(false)}>나중에 할게요</button></form>:<><button className="mp-btn" disabled={busy} onClick={start}>{busy?'등록 화면을 준비하고 있어요…':benefit?'기념일 등록하고 혜택 받기':'기념일 등록하기'}</button><p className="mp-fine">선택 사항이에요. 등록하지 않아도 주문은 완료됩니다.</p></>}{error&&<p role="alert" className="mp-note">{error}</p>}</section><a className="payment-success-home" href="/">쇼핑 계속하기 →</a></section>;
}
