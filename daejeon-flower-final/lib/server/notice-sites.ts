import {cleanNoticeFields,validNoticeDate} from '../../src/frontend/notice-fields';
export const DIRECT_NOTICE_HOSTS=['samga.co.kr','letterb.barunsoncard.com'];
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
function decode(s:string){return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return v>0&&v<=0x10ffff?String.fromCodePoint(v):''}).replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')}
const text=(s:string)=>normalize(decode(s.replace(/<[^>]*>/g,' ')));
const sanitized=(s:string)=>s.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
function block(html:string,tag:string,cls:string){return new RegExp('<'+tag+'\\b[^>]*\\bclass\\s*=\\s*["\\\'][^"\\\']*\\b'+cls+'\\b[^"\\\']*["\\\'][^>]*>([\\s\\S]*?)<\\/'+tag+'>','i').exec(html)?.[1]||''}
function dateText(s:string){const m=/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(s);if(!m)return '';const v=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');return validNoticeDate(v)?v:''}
function timeText(s:string){const m=/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/.exec(s);if(!m)return '';let h=Number(m[2]),min=Number(m[3]||0);if(m[1]&&h>=1&&h<=12){h=h%12+(m[1]==='오후'?12:0)}else if(m[1])return '';if(h>23||min>59)return '';return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')}
function flightStrings(html:string){const rows:string[]=[];for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){const inner=/self\.__next_f\.push\((\[[\s\S]*\])\)/.exec(m[1]);if(!inner)continue;try{const a=JSON.parse(inner[1]);if(a[0]===1&&typeof a[1]==='string')rows.push(a[1])}catch{}}return rows}
function field(records:string[],key:string){const values=new Set<string>();const pattern=new RegExp('"'+key+'"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")','g');for(const s of records){pattern.lastIndex=0;for(const m of s.matchAll(pattern)){try{const v=JSON.parse(m[1]);if(typeof v==='string'&&v.trim())values.add(v.trim())}catch{}}}return values.size===1?[...values][0]:''}
export function parseNoticeSite(rawURL:string,html:string,kind:string,now=new Date()){
 const url=new URL(rawURL),clean=sanitized(html),values:Record<string,string>={},evidence:Record<string,string>={},warnings:string[]=[];
 if(url.hostname==='samga.co.kr'&&/^\/obituary\/indv\/\d+\/?$/.test(url.pathname)&&kind==='funeral'){
  values.hall=text(block(clean,'h2','funeral-hall'));
  const deceased=text((/<strong\b[^>]*>([\s\S]*?)<\/strong>/i.exec(block(clean,'div','deceased'))?.[1]||''));
  values.deceasedName=deceased.replace(/^故\s*/,'').replace(/\s*\([^)]*\)\s*$/,'').trim();
  const fam=block(clean,'dl','fam');values.chiefMourner=[...fam.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map(m=>text(m[1])).filter(Boolean).join(', ');
  const room=text(/<dt\b[^>]*>\s*빈소\s*<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/i.exec(clean)?.[1]||'');
  values.room=values.hall&&room.startsWith(values.hall)?room.slice(values.hall.length).trim():room;
  const departure=block(clean,'dd','balin');values.departureDate=dateText(text(departure));values.departureTime=timeText(text(block(departure,'span','time')));evidence.departureDate=text(block(departure,'span','date'));evidence.departureTime=text(block(departure,'span','time'));
  values.address=text(block(clean,'p','bugo_info_location'));
  if(!values.hall||!values.deceasedName)return null;
  const when=values.departureDate?new Date(values.departureDate+'T'+(values.departureTime||'23:59')+':00+09:00'):null;
  if(when&&when.getTime()<now.getTime())warnings.push('발인이 지난 부고입니다. 현재 주문할 장소와 일정이 맞는지 확인해주세요.');
  if(!values.departureDate)warnings.push('발인 날짜를 읽지 못했습니다. 원본에서 확인해주세요.');
 }else if(url.hostname==='letterb.barunsoncard.com'&&/^\/inv-[a-z0-9-]+\/?$/i.test(url.pathname)&&kind==='wedding'){
  const records=flightStrings(html);
  values.hall=field(records,'venueName');values.room=field(records,'venueHall');values.address=field(records,'venueAddress');values.groom=field(records,'groomName');values.bride=field(records,'brideName');
  const visible=text(clean),displayDate=dateText(visible),storedDate=field(records,'weddingDate').slice(0,10);
  // Calendar date and weddingTime are separate values. Never use the timestamp's time as the ceremony time.
  values.date=displayDate&&displayDate===storedDate?displayDate:'';evidence.date=/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(visible)?.[0]||'';
  const shownTime=field(records,'weddingTime');values.time=timeText(shownTime);evidence.time=shownTime;
  if(shownTime&&!visible.includes(normalize(shownTime))){values.time='';warnings.push('예식 시각을 화면 표시와 대조하지 못했습니다. 원본에서 확인해주세요.')}
  if(!values.hall||!values.groom||!values.bride)return null;
  if(!values.date)warnings.push('예식 날짜를 확정하지 못했습니다. 원본에서 확인해주세요.');
  if(!values.time)warnings.push('예식 시간을 확정하지 못했습니다. 원본에서 확인해주세요.');
  if(values.date&&new Date(values.date+'T'+(values.time||'23:59')+':00+09:00').getTime()<now.getTime())warnings.push('예식 일정이 지난 청첩장입니다. 현재 주문 일정이 맞는지 확인해주세요.');
 }else return null;
 const fields=cleanNoticeFields(values);for(const [k,v]of Object.entries(fields))if(!evidence[k])evidence[k]=v;
 return {fields,evidence,warnings,needsReview:true,reader:'site',message:'안내장에 표시된 내용을 확인해주세요.'};
}
