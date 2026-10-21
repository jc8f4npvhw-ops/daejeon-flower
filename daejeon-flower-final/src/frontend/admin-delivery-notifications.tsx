import React,{useEffect,useState} from 'react';
import {useAdminConfirm} from './admin-dialog';

const labels:Record<string,string>={PENDING:'발송 대기',WAITING_SETUP:'연결 설정 대기',SENDING:'발송 요청 중',ACCEPTED:'접수됨 · 결과 확인 중',SENT:'전달 완료',FAILED:'실패 · 확인 필요',UNKNOWN:'결과 미확정 · 재발송 금지',CANCELLED:'발송 제외'};
const reasons:Record<string,string>={TEST_RECIPIENT_ONLY:'테스트 번호만 발송하도록 제한되어 있습니다.',INVALID_ORDERER_PHONE:'주문자 연락처를 확인해주세요.',PHOTO_LINK_CONFIGURATION:'사진 확인 주소 설정이 필요합니다.',PROVIDER_REJECTED:'SOLAPI에서 요청이 거절되었습니다. 발송 내역을 확인해주세요.',PROVIDER_DELIVERY_FAILED:'SOLAPI에서 전달 실패로 확인됐습니다.',NETWORK_RESULT_UNKNOWN:'접수됐을 가능성이 있습니다. SOLAPI 발송 내역을 먼저 확인해주세요.',UNCONFIRMED_RESPONSE:'요청 결과를 확정하지 못했습니다. SOLAPI 발송 내역을 확인해주세요.',INTERRUPTED_REQUEST:'요청 중 연결이 종료됐습니다. SOLAPI 발송 내역을 확인해주세요.',ORDER_NO_LONGER_ELIGIBLE:'주문 상태 또는 사진·알림 신청 상태가 바뀌었습니다.'};
export function AdminDeliveryNotifications({api,live}:any) {
  const [data,setData]=useState<any>(null),[page,setPage]=useState(1),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const {ask,dialog}=useAdminConfirm();
  async function load(){if(!live)return;setError('');try{setData(await api('/admin/delivery-notifications?page='+page))}catch(e:any){setError(e.message)}}
  useEffect(()=>{load();if(!live)return;const timer=setInterval(load,15000);return()=>clearInterval(timer)},[page,live]);
  async function retry(row:any){if(!await ask('배송완료 알림을 다시 시도하시겠습니까?','고객에게 카카오톡 발송을 요청합니다.','네, 다시 시도합니다'))return;setBusy(true);try{await api('/admin/delivery-notifications/'+row.id+'/retry','POST',{confirm:true});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
  return <section className="m-panel">{dialog}<div className="m-editor-title"><h2>배송완료 카카오 알림</h2><button onClick={load} disabled={!live||busy}>새로고침</button></div><p>사진을 등록하고 배송완료하면, 알림을 신청한 주문자에게 배송사진 확인 링크를 보냅니다.</p>{!live?<p>관리자 서버 연결 후 실제 발송 상태를 확인할 수 있습니다.</p>:<>
    {error&&<p role="alert">{error}</p>}{data&&<><dl className="ap-info"><div><dt>발송 연결</dt><dd>{data.config.ready?'연결 설정됨':'설정 필요'}</dd></div><div><dt>발송 범위</dt><dd>{data.config.liveSend?'신청한 고객':'지정한 테스트 번호만'}</dd></div><div><dt>사진 확인 주소</dt><dd>{data.config.originConfigured?'설정됨':'설정 필요'}</dd></div><div><dt>API Key / Secret</dt><dd>{data.config.keyConfigured&&data.config.secretConfigured?'등록됨':'서버 비밀값 등록 필요'}</dd></div></dl><p className="m-help">‘접수됨’은 고객 전달 완료와 다릅니다. 결과가 미확정인 건은 중복 발송을 막기 위해 재시도할 수 없습니다.</p>
    {!data.config.liveSend&&!data.config.testPhoneConfigured&&<p role="status">서버에 테스트 수신 번호를 먼저 등록해주세요. 등록 전에는 발송하지 않습니다.</p>}
    {!data.rows.length&&<p>아직 발송 대상이 없습니다. 배송 알림을 신청한 주문의 사진을 등록하고 배송완료 처리하면 표시됩니다.</p>}
    {data.rows.map((row:any)=><article className="m-order" key={row.id}><b>{row.order_no}</b><strong>{labels[row.status]||row.status}</strong><span>주문자 연락처 {row.recipient_phone}</span><small>{row.created_at} · 요청 {row.attempts}회</small>{row.failure_code&&<p>{reasons[row.failure_code]||'SOLAPI 설정 및 발송 내역을 확인해주세요.'}</p>}{['FAILED','WAITING_SETUP'].includes(row.status)&&row.attempts<5&&<button disabled={busy||!data.config.ready} onClick={()=>retry(row)}>알림 다시 시도</button>}</article>)}
    <nav className="aw-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page} / {Math.max(1,Math.ceil(data.total/25))}</span><button disabled={page*25>=data.total} onClick={()=>setPage(p=>p+1)}>다음</button></nav></>}
  </>}</section>;
}
