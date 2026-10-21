export const storeKakaoChannel='https://pf.kakao.com/_XPrmX';
// Upgrade old snapshots once; a later administrator edit or deliberate empty URL stays authoritative.
export function upgradeKakaoChannel(data:any){if(data.kakaoChannelRelease===1)return data;return {...data,kakaoChannelRelease:1,settings:{...data.settings,kakao:data.settings?.kakao?.trim()||storeKakaoChannel}};}
export function kakaoLinks(value:string){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return {home:'',chat:''};if(u.hostname==='pf.kakao.com'&&!u.port&&/^\/_[A-Za-z0-9]+(?:\/chat)?\/?$/.test(u.pathname)){const home='https://pf.kakao.com/'+u.pathname.split('/')[1];return {home,chat:home+'/chat'};}return {home:'',chat:u.href};}catch{return {home:'',chat:''}}}
