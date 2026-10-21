/** Order timestamps are UTC; fulfillment dates are shop-local (Asia/Seoul). */
export function customerOrderDate(value:unknown,utc=false){
 if(typeof value!=='string'||!value.trim())return '일정 확인 필요';
 let text=value.trim();if(utc&&/[T ]\d{2}:/.test(text)){const date=new Date(text.replace(' ','T')+(/(?:Z|[+-]\d{2}:?\d{2})$/.test(text)?'':'Z'));if(Number.isNaN(date.getTime()))return '날짜 확인 필요';text=new Date(date.getTime()+9*3600000).toISOString()}
 const m=text.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:[T ](\d{2}):(\d{2}))?/);if(!m)return '날짜 확인 필요';
 return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일${m[4]?' · '+m[4]+':'+m[5]:''}`;
}
