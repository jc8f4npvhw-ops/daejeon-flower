import React, { useRef, useState, type PointerEvent } from 'react';
import type { MapRegion } from './daejeon-district-boundaries';

const width = 380;
const height = 320;
const maxZoom = 10;
const initialView = { zoom: 1, x: 0, y: 0 };
type Point = { x: number; y: number };
type MapView = typeof initialView;
type MapLabel = Point & { name: string; anchor: Point; labelWidth: number };

function boundedView(zoom: number, x: number, y: number): MapView {
  return { zoom, x: Math.max(width * (1 - zoom), Math.min(0, x)),
    y: Math.max(height * (1 - zoom), Math.min(0, y)) };
}

function zoomAround(view: MapView, amount: number, before: Point, after = before) {
  const zoom = Math.max(1, Math.min(maxZoom, view.zoom * amount));
  const ratio = zoom / view.zoom;
  return boundedView(zoom, after.x - (before.x - view.x) * ratio, after.y - (before.y - view.y) * ratio);
}

function placeLabels(regions: MapRegion[], view: MapView, priority: readonly string[]) {
  const ranks = new Map(priority.map((name, index) => [name, index]));
  const ordered = [...regions].sort((a, b) =>
    (ranks.get(a[0]) ?? priority.length) - (ranks.get(b[0]) ?? priority.length) || b[3] - a[3]);
  const labels: MapLabel[] = [];
  for (const [name, x, y] of ordered) {
    const anchor = { x: x * view.zoom + view.x, y: y * view.zoom + view.y };
    if (anchor.x < 0 || anchor.x > width || anchor.y < 0 || anchor.y > height) continue;
    const labelWidth = name.length * 14 + 10;
    const offsets = view.zoom >= 2 ? [[0, 0], [0, -18], [0, 18], [-32, 0], [32, 0], [-30, -19], [30, 19]] : [[0, 0]];
    for (const [dx, dy] of offsets) {
      const cx = Math.max(labelWidth / 2 + 3, Math.min(width - labelWidth / 2 - 3, anchor.x + dx));
      const cy = Math.max(11, Math.min(height - 11, anchor.y + dy));
      if (labels.some(label => Math.abs(label.x - cx) < (label.labelWidth + labelWidth) / 2 &&
          Math.abs(label.y - cy) < 20)) continue;
      labels.push({ name, x: cx, y: cy, anchor, labelWidth });
      break;
    }
  }
  return labels;
}

export function DaejeonDeliveryMap<Name extends string>({ regions, selection, onSelect, label,
  zoomable = false, priority = [] }: {
  regions: MapRegion<Name>[];
  selection: string;
  onSelect: (name: Name) => void;
  label: string;
  zoomable?: boolean;
  priority?: readonly string[];
}) {
  const [view, setView] = useState(initialView);
  const [pointed, setPointed] = useState('');
  const pointers = useRef(new Map<number, Point>());
  const start = useRef<Point | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const activeName = pointed || selection;
  const labels = placeLabels(regions, view, [activeName, ...priority]);
  const selectedPath = regions.find(region => region[0] === selection)?.[4];

  function position(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * width,
      y: (event.clientY - bounds.top) / bounds.height * height };
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (!zoomable && pointers.current.size > 0)) return;
    const next = position(event);
    if (!pointers.current.size) {
      start.current = next;
      dragging.current = false;
      suppressClick.current = false;
    }
    if (!zoomable || pointers.current.size >= 2) return;
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2) {
      dragging.current = true;
      suppressClick.current = true;
      setPointed('');
      for (const id of pointers.current.keys()) event.currentTarget.setPointerCapture(id);
    }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = position(event);
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)![1];
      const distance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const nextDistance = Math.hypot(next.x - other.x, next.y - other.y);
      const center = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
      const nextCenter = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
      if (distance > 0 && nextDistance > 0) setView(value => zoomAround(value, nextDistance / distance, center, nextCenter));
      return;
    }
    if (view.zoom <= 1 || !start.current) return;
    if (!dragging.current && Math.hypot(next.x - start.current.x, next.y - start.current.y) < 5) return;
    if (!dragging.current) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = true;
      suppressClick.current = true;
      setPointed('');
    }
    setView(value => boundedView(value.zoom, value.x + next.x - previous.x, value.y + next.y - previous.y));
  }

  function endPointer(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) dragging.current = false;
  }

  function adjustZoom(factor: number) {
    setView(value => zoomAround(value, factor, { x: width / 2, y: height / 2 }));
  }

  function pointerSelect(name: Name, detail: number) {
    if (!suppressClick.current || detail === 0) onSelect(name);
  }

  const transform = `translate(${view.x} ${view.y}) scale(${view.zoom})`;

  return <div className="daejeon-map-card">
    <div className="daejeon-map-surface" data-pannable={zoomable && view.zoom > 1}
      onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={endPointer} onPointerCancel={endPointer}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) endPointer(event); }}
      onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) endPointer(event); }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="daejeon-delivery-map" role="group" aria-label={label}>
        <g transform={transform}>
          {regions.map(([name, x, y, , path]) => <g key={name} role="button"
            tabIndex={!zoomable || (x * view.zoom + view.x >= 0 && x * view.zoom + view.x <= width &&
              y * view.zoom + view.y >= 0 && y * view.zoom + view.y <= height) ? 0 : -1}
            aria-label={name} aria-pressed={selection === name} data-pointed={pointed === name}
            onPointerEnter={event => { if (event.pointerType === 'mouse' && !dragging.current) setPointed(name); }}
            onPointerLeave={() => setPointed(value => value === name ? '' : value)}
            onFocus={() => setPointed(name)} onBlur={() => setPointed(value => value === name ? '' : value)}
            onClick={event => pointerSelect(name, event.detail)}
            onKeyDown={event => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onSelect(name);
            }}>
            <path d={path} fillRule="evenodd" vectorEffect="non-scaling-stroke"/>
          </g>)}
          {selectedPath && <path d={selectedPath} className="daejeon-selected-boundary"
            aria-hidden="true" vectorEffect="non-scaling-stroke"/>}
        </g>
        <g aria-hidden="true" className="daejeon-map-labels">
          {labels.map(({ name, x, y, anchor, labelWidth }) => <g key={name}
            data-selected={name === selection}
            onClick={event => pointerSelect(name as Name, event.detail)}>
            {Math.hypot(anchor.x - x, anchor.y - y) > 11 &&
              <path d={`M${anchor.x},${anchor.y} L${x},${y}`} className="daejeon-map-leader"/>}
            <rect x={x - labelWidth / 2} y={y - 10} width={labelWidth} height={20} rx={7}/>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central">{name}</text>
          </g>)}
        </g>
      </svg>
    </div>
    {zoomable && <div className="daejeon-map-toolbar">
      <span>{pointed || '두 손가락으로 확대'}</span>
      <div role="group" aria-label="동 지도 확대 및 축소">
        <button type="button" aria-label="동 지도 축소" disabled={view.zoom <= 1} onClick={() => adjustZoom(1 / 1.65)}>−</button>
        <button type="button" aria-label="동 지도 확대" disabled={view.zoom >= maxZoom} onClick={() => adjustZoom(1.65)}>＋</button>
        <button type="button" disabled={view.zoom <= 1} onClick={() => setView(initialView)}>전체 지도</button>
      </div>
    </div>}
  </div>;
}
