/** Audio starts only following a user gesture. No external audio files. */
export const ORDER_ALERT_REPEAT_MS=2500;
export const ORDER_ALERT_MAX_GAIN=.85;
export function orderAlertAudio(){
 let context:AudioContext|null=null,gain:GainNode|null=null,volume=.7;
 const tones:OscillatorNode[]=[];
 const stop=()=>{for(const o of tones.splice(0)){try{o.stop()}catch{}}};
 return {
  async start(){
   const Audio=(window as any).AudioContext||(window as any).webkitAudioContext;
   if(!Audio)throw Error('이 브라우저는 알림음을 지원하지 않습니다.');
   context??=new Audio();
   if(!gain){gain=context!.createGain();gain.connect(context!.destination)}
   await context!.resume();
   if(context!.state!=='running')throw Error('소리 재생을 허용한 뒤 다시 시작해주세요.');
   gain.gain.value=volume*ORDER_ALERT_MAX_GAIN;
  },
  volume(value:number){volume=Math.min(1,Math.max(0,value));if(gain)gain.gain.value=volume*ORDER_ALERT_MAX_GAIN},
  play(){
   if(!context||context.state!=='running'||!gain)throw Error('소리가 일시 중지되었습니다. 주문 알림 시작을 다시 눌러주세요.');
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
  close(){stop();context?.close().catch(()=>{});context=null;gain=null}
 };
}
