import React from 'react';
import {
  daejeonAddress, daejeonDeliveryFeeText, daejeonDeliveryRates, findDaejeonDeliveryArea,
  type DaejeonDistrict,
} from './daejeon-delivery-rates';
import { daejeonDistrictBoundaries } from './daejeon-district-boundaries';
import './daejeon-delivery-picker.css';

export type DeliveryDestination = { district: DaejeonDistrict | ''; dong: string };
export const emptyDestination: DeliveryDestination = { district: '', dong: '' };

export function DaejeonDeliveryPicker({ destination, onChange }: {
  destination: DeliveryDestination;
  onChange: (destination: DeliveryDestination) => void;
}) {
  const { district, dong } = destination;
  const area = findDaejeonDeliveryArea(district, dong);

  function chooseDistrict(value: DaejeonDistrict | '') {
    if (value !== district) onChange({ district: value, dong: '' });
  }

  return <div className="daejeon-delivery-picker">
    <svg viewBox="0 0 320 270" className="daejeon-delivery-map" role="group" aria-label="대전 배송지역 지도">
      {daejeonDistrictBoundaries.map(region => (
        <g key={region.district} role="button" tabIndex={0} aria-label={region.district}
          aria-pressed={district === region.district}
          onClick={() => chooseDistrict(region.district)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              chooseDistrict(region.district);
            }
          }}>
          <path d={region.path} fillRule="evenodd"/>
          <text x={region.x} y={region.y} textAnchor="middle" dominantBaseline="central">{region.district}</text>
        </g>
      ))}
    </svg>
    <div className="daejeon-delivery-controls">
      <label>구 선택
        <select value={district} onChange={event => chooseDistrict(event.target.value as DeliveryDestination['district'])}>
          <option value="">구를 선택해주세요</option>
          {Object.keys(daejeonDeliveryRates).map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label>동 선택
        <select value={dong} disabled={!district} onChange={event => onChange({ district, dong: event.target.value })}>
          <option value="">{district ? '동을 선택해주세요' : '구를 먼저 선택해주세요'}</option>
          {district && Object.keys(daejeonDeliveryRates[district]).map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
    </div>
    <div aria-live="polite">
      {area && <div className="summary daejeon-delivery-fee">
        <div className="summary-row"><span>선택한 배송 지역</span><b>{daejeonAddress(area)}</b></div>
        <div className="summary-row"><span>예상 배송비</span><b>{daejeonDeliveryFeeText(area)}</b></div>
        <p className="help">실제 주소와 배송 일시를 확인한 뒤 카카오톡에서 최종 금액을 안내해드려요.</p>
      </div>}
    </div>
  </div>;
}
