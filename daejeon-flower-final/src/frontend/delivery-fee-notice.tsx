import React from 'react';
import {deliveryEstimate,deliveryPricing} from './delivery-pricing';
export function DeliveryFeeNotice({settings,zoneId='',onZoneChange,subtotal}:{
 settings:any;zoneId?:string;onZoneChange?:(id:string)=>void;subtotal?:number;
}){
 const policy=deliveryPricing(settings),fee=deliveryEstimate(settings,zoneId),won=(n:number)=>n.toLocaleString('ko-KR')+'원';
 return <section className="delivery-fee-notice" aria-label="배송비 안내">
  <header><span aria-hidden="true">↗</span><div><small>DELIVERY</small><b>기본 배송비 {won(fee.baseFee)}</b></div></header>
  <p>배송 지역에 따라 추가금이 더해져요.</p>
  {!!policy.zones.length&&onZoneChange&&<label>배송 지역<select aria-label="배송비 안내 지역" value={zoneId} onChange={e=>onZoneChange(e.target.value)}><option value="">지역을 선택해주세요</option>{policy.zones.map(z=><option key={z.id} value={z.id}>{z.label}</option>)}<option value="other">그 외 지역 · 확인 후 안내</option></select></label>}
  <dl><div><dt>기본 배송비</dt><dd>{won(fee.baseFee)}</dd></div><div><dt>지역별 추가금</dt><dd>{fee.additionalFee===null?'배송지 확인 후 안내':'+ '+won(fee.additionalFee)}</dd></div>{subtotal!==undefined&&<div><dt>상품·옵션 금액</dt><dd>{won(subtotal)}</dd></div>}<div className="delivery-fee-total"><dt>{subtotal===undefined?'예상 배송비':'예상 결제 금액'}</dt><dd>{fee.total===null?'배송비 확정 후 안내':won(fee.total+(subtotal??0))}</dd></div></dl>
  <small>입력하신 실제 주소를 확인한 뒤 배송비를 확정합니다. 확정된 총액을 보고 결제하실 수 있어요.</small>
 </section>;
}
