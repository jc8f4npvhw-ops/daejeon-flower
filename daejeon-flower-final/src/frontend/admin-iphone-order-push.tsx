import React, {useEffect,useState} from 'react';

type Call = (path:string,method?:string,body?:unknown)=>Promise<any>;
const prefix='/admin/order-push/';
const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & {standalone?:boolean}).standalone===true;
const keyBytes = (value:string) => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));

export function AdminIphoneOrderPush({api}:{api:Call}) {
  const [supported,setSupported]=useState(false),[installed,setInstalled]=useState(false),
    [device,setDevice]=useState<ServiceWorkerRegistration|null>(null),[publicKey,setPublicKey]=useState(''),
    [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),
    [failed,setFailed]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>{
    let active=true;
    const isIos=ios(), isApp=standalone();
    setSupported(isIos);setInstalled(isApp);
    if(!isIos||!isApp)return;
    if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)){
      setFailed(true);setMessage('웹 푸시를 사용할 수 없습니다. 아이폰의 iOS 버전을 확인해 주세요.');return;
    }
    const load=async()=>{
      setFailed(false);setMessage('');setPublicKey('');setDevice(null);
      const config=await api(prefix+'config');
      if(typeof config?.publicKey!=='string')throw Error('푸시 서버 키를 확인해 주세요.');
      await navigator.serviceWorker.register('/admin-order-push-sw.js',{scope:'/admin'});
      const reg=await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_,reject)=>setTimeout(()=>reject(Error('알림을 준비하지 못했어요. 홈 화면 앱을 다시 열어주세요.')),12000))
      ]);
      const previous=await reg.pushManager.getSubscription();
      const result=previous?await api(prefix+'status','POST',{endpoint:previous.endpoint}):null;
      if(active){setDevice(reg);setPublicKey(config.publicKey);setEnabled(result?.enabled===true);}
    };
    void load().catch((error)=>{if(active){setFailed(true);setMessage(error.message);}});
    return()=>{active=false;};
  },[api,reload]);
  const run = (action:'enable'|'test'|'disable') => {
    if(!device||busy)return;
    setBusy(true);setMessage('');setFailed(false);
    const finish=async()=>{
      if(action==='enable'){
        // Start subscribe directly in the button gesture (required by iOS).
        const subscription=await device.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});
        await api(prefix+'subscribe','POST',subscription.toJSON());setEnabled(true);
        setMessage('이 아이폰에 주문 푸시가 연결됐어요.');
        return;
      }
      const subscription=await device.pushManager.getSubscription();
      if(!subscription){setEnabled(false);throw Error('아이폰 푸시를 다시 연결해 주세요.');}
      if(action==='test'){
        await api(prefix+'test','POST',{endpoint:subscription.endpoint});
        setMessage('테스트 푸시를 보냈어요. 아이폰 알림 센터를 확인해 주세요.');
      } else {
        await api(prefix+'unsubscribe','POST',{endpoint:subscription.endpoint});
        setEnabled(false);await subscription.unsubscribe();
        setMessage('이 아이폰의 주문 푸시가 해제됐어요.');
      }
    };
    void finish().catch((error)=>{
      setFailed(true);
      if(Notification.permission==='denied')setMessage('아이폰 설정 → 알림 → 대전꽃백화점 관리자에서 알림을 허용해 주세요.');
      else setMessage(error.message||'아이폰 푸시를 처리하지 못했어요.');
      if(action==='test' && /만료/.test(String(error.message))){
        setEnabled(false);
        void device.pushManager.getSubscription().then(s=>s?.unsubscribe()).catch(()=>{});
      }
    }).finally(()=>setBusy(false));
  };
  return <div className="oa-push-settings">
    <h3>아이폰 주문 푸시</h3>
    {!supported?<p>아이폰 Safari에서 관리자 화면을 열고 홈 화면에 추가하면 설정할 수 있어요.</p>:
      !installed?<p>Safari 하단 공유 → <strong>홈 화면에 추가</strong>를 누르세요. 홈 화면에서 새 관리자 아이콘을 열고 로그인한 다음, 여기서 푸시를 한 번 허용해 주세요.</p>:
      <>
        <p>{enabled?'이 아이폰의 주문 푸시가 켜져 있어요.':'이 아이폰의 주문 푸시가 연결되지 않았어요.'} 한 번 연결하면 화면을 닫아도 결제 완료된 새 주문의 알림을 받을 수 있어요.</p>
        {enabled?<><button type="button" disabled={busy} onClick={()=>run('test')}>테스트 푸시 보내기</button>{' '}
          <button type="button" disabled={busy} onClick={()=>run('disable')}>이 아이폰의 푸시 끄기</button></>:
          <button type="button" disabled={busy||!device||!publicKey} onClick={()=>run('enable')}>아이폰 푸시 알림 켜기</button>}
        {!device&&!failed&&<p>아이폰 푸시 준비 중…</p>}
        {failed&&!device&&<button type="button" onClick={()=>setReload(v=>v+1)}>연결 다시 확인</button>}
        {message&&<p role={failed?'alert':'status'}>{message}</p>}
      </>}
  </div>;
}
