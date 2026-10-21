import {cleanNoticeFields,validNoticeDate} from './notice-fields';
// Conservative, label-based extraction. Never infer a missing year, person or venue.
export function parseNoticeText(raw:string,kind:string,now=new Date()){
 const lines=raw.normalize('NFKC').replace(/\r/g,'').split('\n').map(s=>s.replace(/[ \t]+/g,' ').trim()).filter(Boolean).slice(0,500);
 const values:Record<string,string>={},evidence:Record<string,string>={},warnings:string[]=[];
 const put=(key:string,value:string,source:string)=>{if(value&&value.length<=300){values[key]=value;evidence[key]=source.slice(0,400)}};
 const labeled=(labels:string)=>{const re=new RegExp('^(?:'+labels+')\\s*[:：;；|]?\\s*(.*)$');for(let i=0;i<lines.length;i++){const m=re.exec(lines[i]);if(!m)continue;const value=m[1]||lines[i+1]||'';if(value&&!/계좌|은행|연락처|전화|마음\s*전하|보내는\s*분/.test(value))return {value,source:lines[i]+' '+(!m[1]?value:'')}}return {value:'',source:''}};
 const hall=labeled(kind==='funeral'?'장례식장(?:명)?|장소':'예식장(?:명)?|예식\s*장소|장소');
 if(hall.value)put('hall',hall.value,hall.source);
 if(!values.hall){const candidates=lines.filter(s=>!/^https?:|계좌|은행|연락처|전화|주소|교통|주차/.test(s)&&s.length<100&&(kind==='funeral'?/장례식장|장례문화원|장례문화센터/.test(s):/웨딩홀|웨딩컨벤션|컨벤션|웨딩센터/.test(s)));if(candidates.length===1)put('hall',candidates[0],candidates[0])}
 const room=labeled(kind==='funeral'?'빈소|호실':'예식홀|홀\s*이름|홀');if(room.value)put('room',room.value,room.source);
 const address=labeled('주소|소재지');if(address.value)put('address',address.value,address.source);
 for(const [key,label]of(kind==='funeral'?[['deceasedName','고인(?:\s*성함)?'],['chiefMourner','상주(?:\s*성함)?']]:[['groom','신랑(?:\s*성함)?'],['bride','신부(?:\s*성함)?']])){const v=labeled(label);const name=v.value.replace(/^故\s*/,'').replace(/님.*$/,'').replace(/\s*배상$/,'').trim();if(name&&/^[가-힣a-zA-Z·,、\s]{2,100}$/.test(name)&&!/(발인|빈소|예식|주소|연락처|장례|신랑|신부|상주|고인)/.test(name))put(key,name,v.source)}
 const schedule=labeled(kind==='funeral'?'발인(?:\s*(?:일시|일|날짜))?':'예식\s*(?:일시|일|날짜)|결혼\s*일시|일시');
 let context=schedule.value;
 if(context){const idx=lines.findIndex(s=>schedule.source.startsWith(s));context=lines.slice(idx,idx+3).join(' ')}
 // Wedding captures commonly show an unlabelled full date. Require one unique date.
 if(!context&&kind==='wedding'){const dates=lines.filter(s=>/\d{4}\s*(?:년|[.\/-])\s*\d{1,2}\s*(?:월|[.\/-])\s*\d{1,2}/.test(s));if(dates.length===1){const idx=lines.indexOf(dates[0]);context=lines.slice(idx,idx+2).join(' ')}}
 const dateMatches=[...context.matchAll(/(\d{4})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|[.\/-])\s*(\d{1,2})(?:\s*일)?/g)];
 const dates=[...new Set(dateMatches.map(m=>m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')))];const dateKey=kind==='funeral'?'departureDate':'date',timeKey=kind==='funeral'?'departureTime':'time';
 if(dates.length===1&&validNoticeDate(dates[0]))put(dateKey,dates[0],context);
 const times=[...context.matchAll(/(?:(오전|오후|AM|PM)\s*)?(\d{1,2})\s*(시|:)\s*(\d{1,2})?\s*분?/gi)].map(m=>{let h=Number(m[2]),min=Number(m[4]||0);if(min>59||h>23)return '';if(m[1]){if(h<1||h>12)return '';h=h%12+(/오후|PM/i.test(m[1])?12:0)}else if(m[3]==='시'&&h<=12)return '';return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')}).filter(Boolean);
 const uniqueTimes=[...new Set(times)];if(uniqueTimes.length===1)put(timeKey,uniqueTimes[0],context);
 const fields=cleanNoticeFields(values);if(!fields[dateKey])warnings.push('날짜를 확실하게 읽지 못했습니다. 연도와 날짜를 원본에서 확인해주세요.');if(!fields[timeKey])warnings.push('시간을 확실하게 읽지 못했습니다. 오전·오후를 확인해주세요.');
 if(fields[dateKey]&&new Date(fields[dateKey]+'T'+(fields[timeKey]||'23:59')+':00+09:00').getTime()<now.getTime())warnings.push('이미 지난 일정입니다. 현재 주문할 장소와 일정이 맞는지 확인해주세요.');
 return {fields,evidence,warnings,needsReview:true,reader:'browser',text:lines.join('\n')};
}
