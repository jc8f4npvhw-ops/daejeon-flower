import {upgradeKakaoChannel} from './kakao-channel';
import {upgradeOrientalOrchids} from './oriental-orchid-data';
import {upgradeOperatingNotices} from './operating-notices';
import {upgradeStorefrontAdditions} from './storefront-additions';
// Defaults for old content; later admin changes stay authoritative.
export function upgradeWreathRelease(data:any){
 data=upgradeKakaoChannel(data);
 data=upgradeOrientalOrchids(upgradeOperatingNotices(upgradeStorefrontAdditions(data)));
 if(!data.settings.deliveryPricing){data={...data,settings:{...data.settings,deliveryPricing:{baseFee:5000,zones:[]},deliveryNote:'기본 배송비 5,000원에 지역별 추가금이 더해집니다. 배송지 확인 후 확정된 배송비와 결제 총액을 안내해드려요.'}};}
 if((data.wreathRelease||0)>=2)return data;
 return {...data,wreathRelease:2,sections:{...data.sections,CEREMONY:{...data.sections?.CEREMONY,status:'open',title:'화환',message:''}}};
}
