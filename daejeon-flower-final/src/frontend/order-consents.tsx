import React from 'react';
import {checkoutMarketingLabel,checkoutMarketingDetails} from './checkout-marketing';

export function OrderConsents({
  settings, privacy, terms, onPrivacyChange, onTermsChange,
  marketing, onMarketingChange, onAcceptAll, acceptAllDisabled,
}:any){
  return <fieldset className="order-consents">
    <legend>주문 전 동의</legend>
    <div className="order-consent-checks">
      <label className="check-row">
        <input type="checkbox" checked={privacy} onChange={e=>onPrivacyChange(e.target.checked)}/>
        <span>[필수] 개인정보 수집·이용에 동의합니다.</span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={terms} onChange={e=>onTermsChange(e.target.checked)}/>
        <span>[필수] 이용약관 및 취소·환불 안내에 동의합니다.</span>
      </label>
      {onMarketingChange&&<div>
        <label className="check-row">
          <input type="checkbox" checked={marketing===true} onChange={e=>onMarketingChange(e.target.checked)}/>
          <span>[선택] {checkoutMarketingLabel}</span>
        </label>
        <details className="checkout-policy">
          <summary>선택 동의 안내 보기</summary>
          <p>{checkoutMarketingDetails}</p>
        </details>
      </div>}
    </div>
    <div className="order-consent-policies">
      <details className="checkout-policy">
        <summary>개인정보 수집·이용 안내 보기</summary>
        <p style={{whiteSpace:'pre-wrap'}}>{settings.orderPrivacy}</p>
        <p style={{whiteSpace:'pre-wrap'}}>{settings.privacy}</p>
      </details>
      <details className="checkout-policy">
        <summary>이용약관·취소/환불 안내 보기</summary>
        <p style={{whiteSpace:'pre-wrap'}}>{settings.terms}</p>
        <p><a href="/refund" target="_blank" rel="noopener noreferrer">취소·교환·환불 정책 보기 (새 창)</a></p>
      </details>
    </div>
    {onAcceptAll&&<div style={{marginTop:16}}>
      <button type="button" className="cta" disabled={acceptAllDisabled} onClick={onAcceptAll}>
        모두 동의하고 진행
      </button>
    </div>}
  </fieldset>;
}
