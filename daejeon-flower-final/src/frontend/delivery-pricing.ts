export type DeliveryZone={id:string;label:string;additionalFee:number|null};
export type DeliveryPricing={baseFee:number;zones:DeliveryZone[]};
export const DEFAULT_DELIVERY_NOTE='기본 배송비 5,000원에 지역별 추가금이 더해집니다. 배송지 확인 후 확정된 배송비와 결제 총액을 안내해드려요.';
export function deliveryPricing(settings:any):DeliveryPricing{
 return settings?.deliveryPricing??{baseFee:5000,zones:[]};
}
export function deliveryPricingError(settings:any):string{
 const p=settings?.deliveryPricing;if(p===undefined)return '';
 if(!p||!Number.isSafeInteger(p.baseFee)||p.baseFee<0||p.baseFee>1000000||!Array.isArray(p.zones)||p.zones.length>300)return '기본 배송비와 지역 설정을 확인해주세요.';
 const ids=new Set(),names=new Set();
 for(const z of p.zones){
  if(!z||typeof z.id!=='string'||!z.id||z.id.length>100||ids.has(z.id)||typeof z.label!=='string'||!z.label.trim()||z.label.length>100||names.has(z.label.trim())||!(z.additionalFee===null||Number.isSafeInteger(z.additionalFee)&&z.additionalFee>=0&&p.baseFee+z.additionalFee<=1000000))return '지역 이름은 중복 없이 입력하고, 추가금은 0원 이상의 정수 또는 미정으로 입력해주세요.';
  ids.add(z.id);names.add(z.label.trim());
 }
 return '';
}
export function deliveryEstimate(settings:any,zoneId=''){
 const p=deliveryPricing(settings),zone=p.zones.find(z=>z.id===zoneId);
 const additionalFee=zone?.additionalFee??null;
 return {baseFee:p.baseFee,zoneId:zone?.id||'',zoneLabel:zone?.label||'',additionalFee,total:additionalFee===null?null:p.baseFee+additionalFee};
}
// Old quotes retain the policy captured when requested. No snapshot means legacy pricing.
export function quoteBaseFee(payload:any){return payload.deliveryPricingSnapshot?.baseFee??0}
