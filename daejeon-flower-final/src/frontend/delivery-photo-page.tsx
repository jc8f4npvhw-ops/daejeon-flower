'use client';
import React, {useEffect, useRef, useState} from 'react';

export default function DeliveryPhotoPage() {
  const [data,setData] = useState<any>(null), [error,setError] = useState('');
  const [link] = useState(() => {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    return {order:url.searchParams.get('order') || '',access:new URLSearchParams(url.hash.slice(1)).get('access')};
  });
  const grant = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const {order,access} = link || {order:url.searchParams.get('order') || '',access:new URLSearchParams(url.hash.slice(1)).get('access')};
    // Remove the secret before network requests, analytics or accidental link copying.
    if (url.hash) history.replaceState(null, '', url.pathname + url.search);
    const base = '/api/delivery/' + encodeURIComponent(order);
    const run = async () => {
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(order)) throw Error('카카오톡의 배송사진 확인하기 버튼으로 다시 열어주세요.');
      if (access) {
        grant.current ??= fetch(base + '/session', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:access})}).then(response => {
          if (!response.ok) throw Error('사진 확인 링크가 만료되었거나 올바르지 않습니다. 매장에 문의해주세요.');
        });
        await grant.current;
      }
      const response = await fetch(base, {credentials:'same-origin', cache:'no-store'});
      const result: any = await response.json();
      if (!response.ok) throw Error(result.message || '사진을 불러오지 못했습니다.');
      if (active) setData(result);
    };
    run().catch(e => {if(active)setError(e.message)});
    return () => {active=false};
  }, []);
  return <main className="delivery-customer-page" style={{maxWidth:620,margin:'0 auto',padding:'36px 20px',minHeight:'100vh'}}>
    <a href="/" style={{fontSize:15,textDecoration:'none'}}>대전꽃백화점</a>
    <h1 style={{fontSize:28,lineHeight:1.4,marginTop:32}}>소중한 마음을<br/>잘 전해드렸습니다.</h1>
    <p style={{color:'#716f69'}}>주문하신 상품의 배송완료 사진입니다.</p>
    {error?<section role="alert"><p>{error}</p><a href="https://pf.kakao.com/_XPrmX/chat">매장에 문의하기</a></section>:!data?<p role="status">배송사진을 불러오고 있습니다.</p>:<>
      <section style={{background:'#fff',padding:20,borderRadius:20,margin:'24px 0'}}><small>주문번호 · {data.orderNo}</small>{data.products.map((name:string,i:number)=><p key={i}>{name}</p>)}<p>배송완료 · {data.completedAt?new Date(data.completedAt.replace(' ','T')+'Z').toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'확인 완료'}</p></section>
      <div style={{display:'grid',gap:16}}>{data.photos.map((photo:any,i:number)=><a key={photo.id} href={photo.src} target="_blank" rel="noreferrer"><img src={photo.src} alt={`배송완료 사진 ${i+1}`} style={{display:'block',width:'100%',borderRadius:20}}/></a>)}</div>
      {!data.photos.length&&<p>사진을 확인 중입니다. 매장에 문의해주세요.</p>}
      <p style={{fontSize:14,color:'#716f69',marginTop:24}}>이 링크로 해당 주문의 사진을 확인할 수 있습니다. 다른 사람에게 전달하지 않도록 보관해주세요.</p>
      <a href="https://pf.kakao.com/_XPrmX/chat">배송 관련 문의하기</a>
    </>}
  </main>;
}
