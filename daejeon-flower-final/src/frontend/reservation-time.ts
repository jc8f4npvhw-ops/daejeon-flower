export function shopDate(now=Date.now()){return new Date(now+9*3600000).toISOString().slice(0,10)}
export function pastReservationTime(date:string,time:string,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time||''))return false;
 return Date.parse(date+'T'+time+':00+09:00')<=now;
}
