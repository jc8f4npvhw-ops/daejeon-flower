import {orientalOrchids,orchidPhotoKey} from './oriental-orchid-data';
export const detailFields=[
 ...orientalOrchids.map(o=>({group:'동양난 · '+o.name,text:o.description})),
 {group:'근조화환',text:'마지막 인사에,\n새 꽃으로 예를 갖춥니다.'},
 {group:'근조화환',text:'국화와 백합이 담긴 실제 주문 사례입니다. 보내는 분의 이름과 마음이 정중하게 전해지도록 주문 내용을 확인합니다.'},
 {group:'축하화환',text:'두 사람의 시작에,\n새 꽃으로 축하를 전합니다.'},
 {group:'축하화환',text:'보내는 분의 이름과 축하 문구를 리본에 담습니다. 예식장과 예식홀, 두 분의 성함을 정확히 남겨주세요.'},
 {group:'계절 동양난',text:'정확한 품종은 수령일과 실제 입고 상황을 확인해 안내합니다. 꼭 원하시는 품종이 있다면 주문 전에 문의해주세요.'}
];
export const detailImages=[
 ...orientalOrchids.map(o=>({key:orchidPhotoKey(o.name),src:o.photo})),
 {key:'근조화환 상세 메인',src:'/api/media/public/seed/wreath-hero.png'},
 {key:'근조화환 상세 구성',src:'/api/media/public/seed/wreath-detail.png'},
 {key:'축하화환 상세 메인',src:'/api/media/public/seed/celebrate-hero.png'},
 {key:'축하화환 상세 구성',src:'/api/media/public/seed/celebrate-detail.png'}
];
