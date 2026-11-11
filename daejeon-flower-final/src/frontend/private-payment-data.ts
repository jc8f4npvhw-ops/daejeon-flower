export function validPrivatePickup(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const date=new Date(value+':00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,16)===value;
}
export function validatePrivatePayments(data:any,allowLocked=false){if(data.privatePayments===undefined)return;const rows=data.privatePayments;if(!Array.isArray(rows)||rows.length>200)throw Error('개인고객결제 항목은 200개 이하로 등록해주세요.');const ids=new Set();for(const p of rows){if(!p||typeof p.id!=='string'||!/^pp_[a-f0-9-]{36}$/.test(p.id)||ids.has(p.id)||typeof p.title!=='string'||!p.title.trim()||p.title.length>80||typeof p.active!=='boolean'||( !(allowLocked&&p.locked===true)&&(!Number.isSafeInteger(p.amount)||p.amount<1||p.amount>10000000)))throw Error('개인고객결제의 이름·금액·표시 여부를 확인해주세요. 금액은 1원~1천만원의 정수입니다.');if(p.password!==undefined&&p.password!==''&&(typeof p.password!=='string'||p.password.length<4||p.password.length>64))throw Error('결제 비밀번호는 4자 이상(최대 64자)으로 입력해주세요.');if(p.pickupAt!=null&&p.pickupAt!==''&&!validPrivatePickup(p.pickupAt))throw Error('픽업 날짜와 시간을 확인해주세요.');ids.add(p.id)}}
