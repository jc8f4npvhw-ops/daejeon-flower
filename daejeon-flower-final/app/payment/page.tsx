'use client';
import {useEffect,useState,useRef} from 'react';
import './checkout.css';
import {PaymentSuccess,CompletedPayment} from '../../src/frontend/payment-success';
declare global{interface Window{TossPayments:any}}
const won=(value:number)=>value.toLocaleString('ko-KR')+'원';
function schedule(value?:string){
 const parts=value?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
 if(!parts)return null;
 const [,y,m,d,h,minute]=parts;
 return {date:y+'년 '+Number(m)+'월 '+Number(d)+'일',time:(Number(h)<12?'오전 ':'오후 ')+(Number(h)%12||12)+':'+minute};
}
let sdk:Promise<void>|undefined;
function loadToss(){
 if(window.TossPayments)return Promise.resolve();
 if(!sdk)sdk=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.tosspayments.com/v2/standard';script.onload=()=>resolve();script.onerror=()=>{script.remove();sdk=undefined;reject(Error('결제창을 불러오지 못했습니다.'))};document.head.appendChild(script)});
 return sdk;
}
export default function Payment(){
 const [completed,setCompleted]=useState<CompletedPayment|null>(null),[access,setAccess]=useState({orderId:'',token:''});
 const [data,setData]=useState<any>(null),[message,setMessage]=useState('결제 정보를 확인하고 있습니다.'),[busy,setBusy]=useState(false);const once=useRef(false);
 useEffect(()=>{if(once.current)return;once.current=true;const q=new URLSearchParams(location.search);(async()=>{try{
  const orderId=q.get('orderId')||'',token=q.get('token')||'';
  if(q.get('paymentKey')){
   const r=await fetch('/api/payments/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,token,paymentKey:q.get('paymentKey'),amount:Number(q.get('amount'))})});const result:any=await r.json();if(!r.ok||result.status!=='PAID')throw Error(result.message||'결제 완료를 확인하지 못했습니다.');
   setAccess({orderId:result.orderNo,token});setCompleted({...result});history.replaceState(history.state,'',location.pathname);return;
  }
  const quote=!!q.get('quoteId'),r=await fetch(quote?'/api/quotes/'+encodeURIComponent(q.get('quoteId')!)+'?token='+encodeURIComponent(token):'/api/payments/session?'+q);const d:any=await r.json();if(!r.ok)throw Error(d.message);
  if(!quote&&d.status==='PAID'){setAccess({orderId:d.orderId,token});setCompleted({...d,orderNo:d.orderId});history.replaceState(history.state,'',location.pathname);return}
  setData({...d,quote});setMessage(q.has('code')?'결제가 완료되지 않았습니다. 결제 수단을 다시 선택해주세요.':'주문 내용을 확인해주세요.');
 }catch(e:any){setMessage(e.message||'결제 정보를 확인하지 못했습니다.')}})()},[]);
 async function pay(){if(busy)return;setBusy(true);try{const q=new URLSearchParams(location.search);
  if(data.quote){const r=await fetch('/api/quotes/'+q.get('quoteId')+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:q.get('token')})});const d:any=await r.json();if(!r.ok)throw Error(d.message);location.assign(d.redirectUrl);return}
  if(!data.clientKey)throw Error('결제 연결 준비 중입니다. 매장에 문의해주세요.');
  await loadToss();
  const widget=window.TossPayments(data.clientKey).widgets({customerKey:window.TossPayments.ANONYMOUS});await widget.setAmount({currency:'KRW',value:data.amount});await widget.renderPaymentMethods({selector:'#payment-methods',variantKey:'DEFAULT'});await widget.renderAgreement({selector:'#payment-agreement',variantKey:'AGREEMENT'});setData({...data,widget});
 }catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 const autoOrder=useRef('');
 useEffect(()=>{
  if(!data?.orderId||data.quote||!data.clientKey||autoOrder.current===data.orderId)return;
  autoOrder.current=data.orderId;
  void pay();
 },[data?.orderId,data?.clientKey,data?.quote]);
 async function requestPayment(){
  if(busy||!data?.widget)return;
  setBusy(true);
  try{
   const token=new URLSearchParams(location.search).get('token')||'';
   await data.widget.requestPayment({orderId:data.orderId,orderName:data.orderName,successUrl:location.origin+'/payment?token='+encodeURIComponent(token),failUrl:location.origin+'/payment?'+new URLSearchParams({orderId:data.orderId,token})});
  }catch(e:any){setMessage(e.message||'결제창을 열지 못했습니다.')}finally{setBusy(false)}
 }
 async function cancelPending(){
  if(busy||!confirm('결제 준비를 취소하고 쿠폰을 돌려받을까요?'))return;
  setBusy(true);
  try{
   const token=new URLSearchParams(location.search).get('token');
   const response=await fetch('/api/payments/cancel-pending',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:data.orderId,token})});
   const result=await response.json() as {message?:string};if(!response.ok)throw Error(result.message);
   setData(null);setMessage('결제 준비를 취소했습니다. 쿠폰은 사용 가능 상태로 돌아갔습니다.');
  }catch(e:any){setMessage(e.message)}finally{setBusy(false)}
 }
 if(completed)return <main className="app-shell payment-success-shell"><PaymentSuccess payment={completed} access={access}/></main>;
 const when=schedule(data?.fulfillmentAt),amount=Number(data?.amount??data?.total??0);
 const options=[data?.orderStyle,data?.orderVariant].filter(Boolean).join(' · ');
 const method=data?.fulfillmentType==='DELIVERY'?'배송':data?.fulfillmentType==='PICKUP'?'매장 픽업':null;
 return <main className="checkout-pay">
  <header className="checkout-pay-header"><a href="/">대전꽃백화점</a><span>안전 결제</span></header>
  <h1>{data?.quote?'배송비 확인':'결제하기'}</h1>
  <p className="checkout-pay-status" role="status">{message}</p>
  {data&&data.status!=='PAID'&&<>
   <section className="checkout-pay-card" aria-label="주문 요약">
    <div className="checkout-pay-total"><span>총 결제 금액</span><strong>{won(amount)}</strong></div>
    <dl>
     <div><dt>주문 상품</dt><dd>{data.orderName||data.productName}{options&&<small>{options}</small>}</dd></div>
     {method&&<div><dt>수령 방법</dt><dd>{method}</dd></div>}
     {method&&<div><dt>수령 날짜</dt><dd>{when?.date??'매장 확인 후 안내'}</dd></div>}
     {method&&<div><dt>수령 시간</dt><dd>{when?.time??'매장 확인 후 안내'}</dd></div>}
     {data.quote&&<><div><dt>상품 금액</dt><dd>{won(data.subtotal)}</dd></div><div><dt>확정 배송비</dt><dd>{won(data.deliveryFee)}<small>기본 {won(data.deliveryBaseFee)} · 지역 추가 {won(data.deliveryAdditionalFee)}</small></dd></div></>}
     {data.discount>0&&<div><dt>기념일 쿠폰</dt><dd>−{won(data.discount)}</dd></div>}
    </dl>
   </section>
   {!data.quote&&<section className="checkout-pay-card checkout-pay-methods" aria-label="결제 수단"><h2>결제 수단</h2>{busy&&!data.widget&&<p role="status">결제 수단을 불러오고 있어요.</p>}<div id="payment-methods"/><div id="payment-agreement"/></section>}
   <div className="checkout-pay-actions">
    {data.widget?<button className="checkout-pay-button" disabled={busy} onClick={requestPayment}>{busy?'결제 진행 중…':won(amount)+' 결제하기'}</button>:<button className="checkout-pay-button" disabled={busy||(!data.quote&&!data.clientKey)} onClick={()=>void pay()}>{data.quote?'배송비 확인하고 결제 진행':busy?'결제 수단 불러오는 중…':data.clientKey?'결제 수단 다시 불러오기':'결제 연결 준비 중'}</button>}
    {data.discount>0&&!data.quote&&<button className="mp-link" disabled={busy} onClick={cancelPending}>결제 준비 취소 · 쿠폰 돌려받기</button>}
   </div>
  </>}
  <footer className="checkout-pay-footer"><a href="/">매장으로 돌아가기</a><a href="/refund" target="_blank" rel="noopener noreferrer">취소·교환·환불 안내</a></footer>
 </main>;
}
