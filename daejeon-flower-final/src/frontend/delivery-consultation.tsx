import React, { useState } from 'react';
import { daejeonAddress, daejeonDeliveryFeeText, type DaejeonDeliveryArea } from './daejeon-delivery-rates';
import {kakaoLinks} from './kakao-channel';

export function deliveryInquiryText(payload:any,title:string,area:DaejeonDeliveryArea|null){
 const sku=payload.sku||{};
 const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
 const rows=['안녕하세요. 배송 주문 상담을 원해요.',`상품: ${title||payload.productTitle||sku.product||''}`,...(sku.style?[`스타일: ${sku.style}`]:[]),...(sku.size?[`사이즈·구성: ${sku.size}`]:[]),`주문자: ${payload.name||''}`,`주문자 연락처: ${payload.phone||''}`,`희망 배송 일시: ${payload.date||''} ${payload.time||''}`,`배송 주소: ${payload.address||''}`,`받는 분: ${payload.receiver||''}`,`받는 분 연락처: ${payload.receiverPhone||''}`];
 if(payload.bag)rows.push('쇼핑백: 추가');
 if(Number.isSafeInteger(payload.optionTotal)&&payload.optionTotal>0)rows.push('상품·옵션 금액: '+money(payload.optionTotal));
 if(area){
  rows.push('배송 지역: '+daejeonAddress(area),'배송비: '+daejeonDeliveryFeeText(area));
  if(area.fee!==null&&Number.isSafeInteger(payload.optionTotal)&&payload.optionTotal>0){
   rows.push('예상 결제 금액: '+money(payload.optionTotal+area.fee));
  }
 }
 const card=payload.card||(payload.message?.type==='card'?payload.message.card:'');
 if(card)rows.push('카드 메시지: '+card);
 if(payload.message?.type==='ribbon')rows.push('리본문구: '+[payload.message.left,payload.message.right].filter(Boolean).join(' / '));
 if(payload.request)rows.push('요청사항: '+payload.request);
 const details=payload.customization||{};
 for(const [key,label] of [['color','꽃 색상'],['wrap','보자기 포장'],['orchidVariety','동양난 품종'],['orchidConfiguration','동양난 구성']]){const value=details[key];if(value!==undefined&&value!==null&&value!=='')rows.push(label+': '+(typeof value==='boolean'?(value?'추가':'선택 안 함'):String(value)));}
 rows.push('배송비와 최종 결제 금액 확인 부탁드립니다.');
 return rows.join('\n');
}
export function DeliveryConsultation({disabled,title,payload,settings}:any){
 const [copiedText,setCopiedText]=useState(''),[failedText,setFailedText]=useState('');
 const text=deliveryInquiryText(payload,title,payload.deliveryArea),chat=kakaoLinks(settings.kakao).chat;
 const copied=copiedText===text;
 const status=copied?'문의내용을 복사했어요. 카카오톡 상담창에 붙여넣어 보내주세요.':failedText===text?'자동 복사가 되지 않았어요. 아래 문의내용을 길게 눌러 복사해주세요.':'';
 async function copy(){
  try{
   await navigator.clipboard.writeText(text);
   setCopiedText(text);
   setFailedText('');
  }catch{
   setCopiedText('');
   setFailedText(text);
  }
 }
 return <section className="delivery-consultation" aria-label="배송 주문 카카오톡 상담">
  <h3>이 지역의 배송비는 상담 후 안내해드려요</h3><p className="help">입력한 문의내용을 복사해 카카오톡으로 보내주세요. 배송비와 총액을 확인한 뒤 결제 링크를 안내해 드립니다.</p>
  <p className="help"><b>아직 주문·결제가 접수된 상태가 아닙니다.</b> 카카오톡에서 문의내용을 보내야 상담이 시작됩니다.</p>
  {disabled?<p className="help">상품과 수령 일시, 주문자·받는 분 연락처, 배송 지역과 상세주소를 먼저 입력해주세요.</p>:<textarea aria-label="카카오톡에 보낼 배송 문의내용" readOnly rows={10} value={text} style={{width:'100%',boxSizing:'border-box',font:'inherit',lineHeight:1.8,padding:14,border:'1px solid #ddd6cd',borderRadius:14,margin:'12px 0'}}/>}
  <button type="button" className="soft-btn" disabled={disabled} onClick={copy}>{copied?'문의내용 다시 복사':'문의내용 복사'}</button>
  {!disabled&&chat&&<a className="solid-btn kakao-action" href={chat} target="_blank" rel="noopener noreferrer">카카오톡에서 상담받기</a>}
  {!chat&&<p className="help">카카오톡 연결을 준비하고 있어요. 매장으로 문의해주세요.</p>}
  <p role="status" className="help">{status}</p>
 </section>;
}
