import {parseNoticeText} from './notice-text';
export async function readNoticeCapture(image:string,kind:string,signal:AbortSignal,onProgress:(s:string)=>void=()=>{}){
 if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>Math.ceil(8*1024*1024*4/3)+100)throw Error('JPG·PNG·WEBP 캡처 사진을 8MB 이하로 선택해주세요.');
 if(location.protocol==='file:'||location.origin==='null')throw Error('캡처 자동 읽기는 홈페이지 주소로 접속하면 사용할 수 있습니다. 지금은 아래 정보를 직접 입력해주세요.');
 if(signal.aborted)throw new DOMException('취소됨','AbortError');
 // Self-host every OCR asset. The image and recognized text never leave this device.
 const {createWorker}=await import('tesseract.js');let worker:any;let closed=false;
 let rejectAbort:(e:any)=>void;const aborted=new Promise<never>((_,reject)=>{rejectAbort=reject});
 const terminate=()=>{if(worker){const active=worker;worker=null;void active.terminate().catch(()=>{})}};
 const stop=()=>{closed=true;terminate();rejectAbort(new DOMException('취소됨','AbortError'))};signal.addEventListener('abort',stop,{once:true});
 try{return await Promise.race([aborted,(async()=>{
  if(signal.aborted)throw new DOMException('취소됨','AbortError');
  worker=await createWorker('kor+eng',1,{workerPath:new URL('/ocr/worker.min.js',location.origin).href,corePath:new URL('/ocr/core',location.origin).href,langPath:new URL('/ocr/lang',location.origin).href,workerBlobURL:false,cacheMethod:'write',errorHandler:()=>rejectAbort(Error('글자 인식 준비에 실패했습니다. 다시 시도하거나 직접 입력해주세요.')),logger:m=>{if(signal.aborted)return;if(m.status==='recognizing text')onProgress('사진 속 글자를 읽고 있어요… '+Math.round((m.progress||0)*100)+'%');else onProgress('처음에는 글자 인식 준비에 시간이 걸릴 수 있어요…')}});
  if(closed||signal.aborted){terminate();throw new DOMException('취소됨','AbortError')}
  await worker.setParameters({preserve_interword_spaces:'1'});
  const {data}=await worker.recognize(image);if(signal.aborted)throw new DOMException('취소됨','AbortError');
  if(!data.text?.trim())throw Error('글자를 읽지 못했습니다. 선명한 캡처를 올리거나 직접 입력해주세요.');
  const result=parseNoticeText(data.text,kind);if(data.confidence<65)result.warnings.unshift('사진의 글자가 선명하지 않을 수 있습니다. 성함과 일정을 꼭 대조해주세요.');return result;
 })()]);}finally{closed=true;signal.removeEventListener('abort',stop);terminate()}
}
