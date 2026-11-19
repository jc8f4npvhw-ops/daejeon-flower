import React, { useEffect, useRef, useState } from 'react';
import {
  daejeonAddress, daejeonDeliveryFeeText, findDaejeonDeliveryArea,
  type DaejeonDistrict,
} from './daejeon-delivery-rates';
import { daejeonDistrictBoundaries, daejeonDongBoundaries } from './daejeon-district-boundaries';
import { DaejeonDeliveryMap } from './daejeon-delivery-map';
import { popularDeliveryDongs } from './daejeon-popular-dongs';
import './daejeon-delivery-picker.css';

export type DeliveryDestination = { district: DaejeonDistrict | ''; dong: string };
export const emptyDestination: DeliveryDestination = { district: '', dong: '' };

export function DaejeonDeliveryPicker({ destination, onChange }: {
  destination: DeliveryDestination;
  onChange: (destination: DeliveryDestination) => void;
}) {
  const { district, dong } = destination;
  const area = findDaejeonDeliveryArea(district, dong);
  const [editing, setEditing] = useState(false);
  const [choosingDistrict, setChoosingDistrict] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusTarget = useRef<'summary' | 'heading' | null>(null);
  const expanded = !area || editing;
  const cityView = !district || choosingDistrict;
  const regions = district ? daejeonDongBoundaries[district] : [];
  const popular = district ? popularDeliveryDongs[district] : [];
  const search = query.trim().replace(/\s/g, '');
  const results = search ? regions.map(([name]) => name).filter(name => name.includes(search)) :
    showAll ? regions.map(([name]) => name) : popular;

  useEffect(() => {
    const target = focusTarget.current === 'summary' ? summary.current :
      focusTarget.current === 'heading' ? heading.current : null;
    if (target) {
      target.focus({ preventScroll: true });
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        target.scrollIntoView({ block: 'center' });
      }
      focusTarget.current = null;
    }
  }, [expanded, cityView, district, dong]);

  function chooseDistrict(next: DaejeonDistrict) {
    focusTarget.current = 'heading';
    setChoosingDistrict(false);
    setQuery('');
    setShowAll(false);
    if (next !== district) onChange({ district: next, dong: '' });
  }

  function close() {
    focusTarget.current = 'summary';
    setChoosingDistrict(false);
    setEditing(false);
  }

  function chooseDong(next: string) {
    if (!district) return;
    close();
    if (next !== dong) onChange({ district, dong: next });
  }

  if (!expanded && area) return <div className="daejeon-delivery-picker">
    <div className="daejeon-address-summary" ref={summary} tabIndex={-1} aria-label={`${daejeonAddress(area)}, 배송비 ${daejeonDeliveryFeeText(area)}`}>
      <div>
        <span>배송 지역</span>
        <strong>{daejeonAddress(area)}</strong>
        <p>배송비 <b>{daejeonDeliveryFeeText(area)}</b></p>
      </div>
      <button type="button" className="daejeon-text-action" onClick={() => {
        focusTarget.current = 'heading';
        setQuery('');
        setShowAll(false);
        setEditing(true);
      }}>변경</button>
    </div>
  </div>;

  return <div className="daejeon-delivery-picker">
    <div className="daejeon-map-heading">
      <h3 ref={heading} tabIndex={-1}>{cityView ? '배송받을 구를 골라주세요' : `${district} · 배송받을 동`}</h3>
      <div>
        {!cityView && <button type="button" className="daejeon-text-action" onClick={() => {
          focusTarget.current = 'heading';
          setChoosingDistrict(true);
        }}>구 변경</button>}
        {area && <button type="button" className="daejeon-text-action" onClick={close}>닫기</button>}
      </div>
    </div>
    {cityView ? <DaejeonDeliveryMap key="city" regions={daejeonDistrictBoundaries} selection={district}
      onSelect={chooseDistrict} label="대전 지도에서 구 선택"/> : <>
      <div className="daejeon-dong-panel">
        <label className="daejeon-dong-filter">동 이름 검색
          <input type="search" value={query} placeholder="동 이름을 입력해주세요"
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing && search && results.length === 1) {
                event.preventDefault();
                chooseDong(results[0]);
              }
            }}/>
        </label>
        <div className="daejeon-dong-panel-heading">
          <h4>{search ? '검색 결과' : showAll ? '전체 동' : '추천 동'}</h4>
          {!search && <button type="button" className="daejeon-text-action" onClick={() => setShowAll(value => !value)}>
            {showAll ? '추천 동 보기' : '전체 동 보기'}
          </button>}
        </div>
        {results.length ? <ul className="daejeon-dong-grid">
          {results.map(name => <li key={name}><button type="button" aria-pressed={dong === name}
            onClick={() => chooseDong(name)}>{name}</button></li>)}
        </ul> : <p className="daejeon-dong-empty" role="status">이름이 일치하는 동이 없어요. 다른 이름으로 검색해보세요.</p>}
      </div>
      <DaejeonDeliveryMap key={district} regions={regions} selection={dong}
        onSelect={chooseDong} label={`${district} 지도에서 동 선택`} priority={popular} zoomable/>
    </>}
  </div>;
}
