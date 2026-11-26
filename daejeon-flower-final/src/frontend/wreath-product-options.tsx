import React from 'react';
import {gallery} from './cms';
import './wreath-order-ui.css';

type WreathVariant = { size: string; price: number };

export function WreathProductOptions({product, variants, selected, onSelect}: {
  product: '축하화환' | '근조화환';
  variants: WreathVariant[];
  selected: string;
  onSelect: (size: string) => void;
}) {
  return (
    <div className="wreath-product-options" role="group" aria-label={product + ' 상품'}>
      {variants.map((variant, index) => {
        const photo = gallery(product, '', variant.size)[0];
        const active = variant.size === selected;
        return (
          <button
            key={variant.size}
            type="button"
            className="wreath-product-option"
            aria-pressed={active}
            onClick={() => onSelect(variant.size)}
          >
            <span className="wreath-product-media">
              {photo
                ? <img src={photo.src} alt="" loading="lazy" decoding="async" />
                : <span>사진 준비 중</span>}
            </span>
            <span className="wreath-product-details">
              {index === 0 && <span className="wreath-product-best">BEST</span>}
              <strong className="wreath-product-name">{variant.size}</strong>
              <span className="wreath-product-price">{variant.price.toLocaleString('ko-KR')}원</span>
              <span className="wreath-product-state" aria-hidden="true">
                <span className="wreath-product-indicator">{active && '✓'}</span>
                {active ? '선택됨' : '선택하기'}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
