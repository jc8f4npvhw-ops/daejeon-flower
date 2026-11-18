/** Audio starts only following a user gesture. No external audio files. */
export const ORDER_ALERT_REPEAT_MS=2500;
export const ORDER_ALERT_MAX_GAIN=.85;
let sharedContext:AudioContext|null=null;
const getOrderAlertContext=()=>{
 if(sharedContext&&sharedContext.state!=='closed')return sharedContext;
 const Audio=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!Audio)throw Error('이 브라우저는 알림음을 지원하지 않습니다.');
 return sharedContext=new Audio();
};
export async function unlockOrderAlertAudio(){
 const context=getOrderAlertContext();
 if(context.state!=='running')await context.resume();
}
export function orderAlertAudio(){
 let context:AudioContext|null=null,gain:GainNode|null=null,volume=1;
 const tones:OscillatorNode[]=[];
 const stop=()=>{for(const o of tones.splice(0)){try{o.stop()}catch{}}};
 return {
  ready(){try{return getOrderAlertContext().state==='running'}catch{return false}},
  watchState(onChange:()=>void){
   try{
    const audio=getOrderAlertContext();
    audio.addEventListener('statechange',onChange);
    return ()=>audio.removeEventListener('statechange',onChange);
   }catch{return ()=>{}}
  },
  async start(){
   context=getOrderAlertContext();
   if(!gain){gain=context!.createGain();gain.connect(context!.destination)}
   if(context!.state!=='running')await context!.resume();
   if(context!.state!=='running')throw Error('소리 재생을 허용한 뒤 다시 시작해주세요.');
   gain.gain.value=volume*ORDER_ALERT_MAX_GAIN;
  },
  volume(value:number){volume=Math.min(1,Math.max(0,value));if(gain)gain.gain.value=volume*ORDER_ALERT_MAX_GAIN},
  play(){
   if(!context||context.state!=='running'||!gain)throw Error('브라우저에서 소리를 일시 중지했어요. 화면을 누르면 다시 준비됩니다.');
   // A repeated sound test replaces the prior chime instead of stacking loud tones.
   stop();
   for(const [i,f]of [784,988,1175].entries()){
    const o=context.createOscillator(),envelope=context.createGain(),at=context.currentTime+i*.22;
    o.type='sine';o.frequency.value=f;
    envelope.gain.setValueAtTime(0,at);
    envelope.gain.linearRampToValueAtTime(.65,at+.025);
    envelope.gain.exponentialRampToValueAtTime(.001,at+.38);
    o.connect(envelope);envelope.connect(gain);tones.push(o);
    o.onended=()=>{o.disconnect();envelope.disconnect();const n=tones.indexOf(o);if(n>=0)tones.splice(n,1)};
    o.start(at);o.stop(at+.4);
   }
  },
  stop,
  close(){stop();gain?.disconnect();context=null;gain=null}
 };
}
