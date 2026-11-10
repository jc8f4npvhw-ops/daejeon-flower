'use client';
import {useEffect,useState,useRef} from 'react';
import {PaymentSuccess,CompletedPayment} from '../../src/frontend/payment-success';
declare global{interface Window{TossPayments:any}}
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
 async function pay(){setBusy(true);try{const q=new URLSearchParams(location.search);
  if(data.quote){const r=await fetch('/api/quotes/'+q.get('quoteId')+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:q.get('token')})});const d:any=await r.json();if(!r.ok)throw Error(d.message);location.assign(d.redirectUrl);return}
  if(!data.clientKey)throw Error('결제 연결 준비 중입니다. 매장에 문의해주세요.');
  if(!window.TossPayments)await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.tosspayments.com/v2/standard';script.onload=()=>resolve();script.onerror=()=>reject(Error('결제창을 불러오지 못했습니다.'));document.head.appendChild(script)});
  const widget=window.TossPayments(data.clientKey).widgets({customerKey:window.TossPayments.ANONYMOUS});await widget.setAmount({currency:'KRW',value:data.amount});await widget.renderPaymentMethods({selector:'#payment-methods',variantKey:'DEFAULT'});await widget.renderAgreement({selector:'#payment-agreement',variantKey:'AGREEMENT'});setData({...data,widget});
 }catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 if(completed)return <main className="app-shell payment-success-shell"><PaymentSuccess payment={completed} access={access}/></main>;
 return <main className="app-shell"><div className="content"><h1>대전꽃백화점</h1><p role="status">{message}</p>{data&&data.status!=='PAID'&&<><h2>{data.orderName||data.productName}</h2><p>{Number(data.amount||data.total).toLocaleString()}원</p>{data.quote&&<><p>상품 {data.subtotal.toLocaleString()}원 + 배송비 {data.deliveryFee.toLocaleString()}원</p><p>기본 배송비 {data.deliveryBaseFee.toLocaleString()}원 + 지역 추가금 {data.deliveryAdditionalFee.toLocaleString()}원 · 확정된 배송비입니다.</p></>}{data.discount>0&&<p>기념일 쿠폰 −{Number(data.discount).toLocaleString()}원 · 할인 반영 금액입니다.</p>}<div id="payment-methods"/><div id="payment-agreement"/>{data.widget?<button className="solid-btn" disabled={busy} onClick={async()=>{setBusy(true);try{const token=new URLSearchParams(location.search).get('token');await data.widget.requestPayment({orderId:data.orderId,orderName:data.orderName,successUrl:location.origin+'/payment?token='+encodeURIComponent(token||''),failUrl:location.origin+'/payment?'+new URLSearchParams({orderId:data.orderId,token:token||''})})}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}}>결제하기</button>:<button className="solid-btn" disabled={busy} onClick={pay}>{data.quote?'배송비 확인하고 결제 진행':'결제 수단 선택'}</button>}{data.discount>0&&!data.quote&&<button className="mp-link" disabled={busy} onClick={async()=>{if(!confirm('결제 준비를 취소하고 쿠폰을 돌려받을까요?'))return;setBusy(true);try{const q=new URLSearchParams(location.search),r=await fetch('/api/payments/cancel-pending',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:data.orderId,token:q.get('token')})});const result:any=await r.json();if(!r.ok)throw Error(result.message);setData(null);setMessage('결제 준비를 취소했습니다. 쿠폰은 사용 가능 상태로 돌아갔습니다.')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}}>결제 준비 취소 · 쿠폰 돌려받기</button>}</>}<p><a href="/">매장으로 돌아가기</a> · <a href="/refund" target="_blank" rel="noopener noreferrer">취소·교환·환불 안내</a></p></div></main>;
}
