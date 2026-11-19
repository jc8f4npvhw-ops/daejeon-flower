import React, { useEffect, useRef, useState } from 'react';
import {
  daejeonAddress, daejeonDeliveryFeeText, findDaejeonDeliveryArea,
  type DaejeonDistrict,
} from './daejeon-delivery-rates';
import { daejeonDistrictBoundaries, daejeonDongBoundaries, type MapRegion } from './daejeon-district-boundaries';
import './daejeon-delivery-picker.css';

export type DeliveryDestination = { district: DaejeonDistrict | ''; dong: string };
export const emptyDestination: DeliveryDestination = { district: '', dong: '' };

function DeliveryMap<Name extends string>({ regions, selection, onSelect, label, zoom = 1 }: {
  regions: MapRegion<Name>[];
  selection: string;
  onSelect: (name: Name) => void;
  label: string;
  zoom?: number;
}) {
  const selectedPath = regions.find(region => region[0] === selection)?.[4];
  return <svg viewBox="0 0 380 320" preserveAspectRatio="xMidYMid meet"
    className="daejeon-delivery-map" style={{ width: `${zoom * 100}%` }}
    role="group" aria-label={label}>
    {regions.map(([name, x, y, radius, path]) => (
      <g key={name} role="button" tabIndex={0} aria-label={name}
        aria-pressed={selection === name}
        onClick={() => onSelect(name)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(name);
          }
        }}>
        <path d={path} fillRule="evenodd" vectorEffect="non-scaling-stroke"/>
        {radius * zoom >= name.length * 5 && <text x={x} y={y} textAnchor="middle"
          dominantBaseline="central" style={{ fontSize: 12 / zoom }}>{name}</text>}
      </g>
    ))}
    {selectedPath && <path d={selectedPath} className="daejeon-selected-boundary"
      aria-hidden="true" vectorEffect="non-scaling-stroke"/>}
  </svg>;
}

export function DaejeonDeliveryPicker({ destination, onChange }: {
  destination: DeliveryDestination;
  onChange: (destination: DeliveryDestination) => void;
}) {
  const { district, dong } = destination;
  const area = findDaejeonDeliveryArea(district, dong);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const districtFocus = useRef<HTMLButtonElement>(null);
  const mapFrame = useRef<HTMLDivElement>(null);
  const districtLayer = useRef<HTMLDivElement>(null);
  const zoomCenter = useRef<{ x: number; y: number } | null>(null);
  const focusAfterSwitch = useRef(false);
  const districtToRefocus = useRef<DaejeonDistrict | null>(null);
  const regions = district ? daejeonDongBoundaries[district] : [];

  useEffect(() => {
    districtLayer.current?.scrollTo(0, 0);
    if (focusAfterSwitch.current) districtFocus.current?.focus({ preventScroll: true });
    focusAfterSwitch.current = false;
    if (!district && districtToRefocus.current) {
      mapFrame.current?.querySelector<SVGElement>(`g[aria-label="${districtToRefocus.current}"]`)
        ?.focus({ preventScroll: true });
      districtToRefocus.current = null;
    }
  }, [district]);

  useEffect(() => {
    const layer = districtLayer.current;
    const center = zoomCenter.current;
    if (layer && center) {
      layer.scrollTo(layer.scrollWidth * center.x - layer.clientWidth / 2,
        layer.scrollHeight * center.y - layer.clientHeight / 2);
    }
    zoomCenter.current = null;
  }, [zoom]);

  function changeZoom(next: number) {
    const layer = districtLayer.current;
    if (layer) zoomCenter.current = {
      x: (layer.scrollLeft + layer.clientWidth / 2) / layer.scrollWidth,
      y: (layer.scrollTop + layer.clientHeight / 2) / layer.scrollHeight,
    };
    setZoom(next);
  }

  function chooseDistrict(next: DaejeonDistrict) {
    if (next === district) return;
    focusAfterSwitch.current = true;
    setZoom(1);
    onChange({ district: next, dong: '' });
  }

  function chooseDong(next: string) {
    if (!district || next === dong) return;
    onChange({ district, dong: next });
  }

  function goBack() {
    districtToRefocus.current = district || null;
    onChange(emptyDestination);
  }

  return <div className="daejeon-delivery-picker">
    <div className="daejeon-map-heading">
      <strong>{district ? `${district} 배송 지도` : '대전광역시 배송 지도'}</strong>
      {district && <button ref={districtFocus} className="daejeon-map-control" type="button"
        onClick={goBack}>← 구 다시 선택</button>}
    </div>
    <div className="daejeon-map-stage" ref={mapFrame}>
      <div className="daejeon-map-layer" data-active={!district} inert={Boolean(district)} aria-hidden={Boolean(district)}>
        <DeliveryMap regions={daejeonDistrictBoundaries} selection={district} onSelect={chooseDistrict} label="대전 지도에서 구 선택"/>
      </div>
      <div ref={districtLayer} className="daejeon-map-layer" data-active={Boolean(district)} inert={!district} aria-hidden={!district}>
        {regions.length > 0 && <DeliveryMap key={district} regions={regions} zoom={zoom}
          selection={dong} onSelect={chooseDong} label={`${district} 지도에서 동 선택`}/>}
      </div>
    </div>
    {district ? <div className="daejeon-map-actions">
      <button className="daejeon-map-control daejeon-dong-search" type="button" onClick={() => {
        setQuery('');
        dialog.current?.showModal();
      }}>동 이름으로 찾기</button>
      <div className="daejeon-zoom-controls" role="group" aria-label="동 지도 확대와 축소">
        <button className="daejeon-map-control" type="button" aria-label="동 지도 축소" disabled={zoom === 1}
          onClick={() => changeZoom(zoom / 2)}>−</button>
        <button className="daejeon-map-control" type="button" aria-label="동 지도 확대" disabled={zoom === 4}
          onClick={() => changeZoom(zoom * 2)}>＋</button>
      </div>
      {zoom > 1 && <p className="help">확대한 지도는 위아래와 좌우로 움직일 수 있어요.</p>}
    </div> : <p className="help">지도에서 배송받으실 구를 선택해주세요.</p>}
    <div aria-live="polite">
      {area && <div className="summary daejeon-delivery-fee">
        <div className="summary-row"><span>선택한 배송 지역</span><b>{daejeonAddress(area)}</b></div>
        <div className="summary-row"><span>배송비</span><b>{daejeonDeliveryFeeText(area)}</b></div>
      </div>}
    </div>
    <dialog className="daejeon-dong-dialog" ref={dialog} aria-label={`${district} 동 이름으로 찾기`}>
      <div className="daejeon-dialog-heading">
        <h3>{district} 배송 동 선택</h3>
        <button className="daejeon-map-control" type="button" onClick={() => dialog.current?.close()}>닫기</button>
      </div>
      <label className="daejeon-dong-filter">동 이름 검색
        <input type="search" value={query} placeholder="예: 가오동"
          onChange={event => setQuery(event.target.value)}/>
      </label>
      <div className="daejeon-dong-grid">
        {regions.filter(([name]) => name.includes(query.trim())).map(([name]) =>
          <button key={name} className="daejeon-map-control" type="button" aria-pressed={dong === name}
            onClick={() => { chooseDong(name); dialog.current?.close(); }}>{name}</button>)}
      </div>
      {!regions.some(([name]) => name.includes(query.trim())) && <p className="help">검색에 해당하는 동이 없어요.</p>}
    </dialog>
  </div>;
}
