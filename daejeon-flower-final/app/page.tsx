import dfSearchStyles from './search-landing.module.css';
import HomeAnalytics from './home-analytics';
import Client from './client';
import {homeHeroImages} from '../src/frontend/home-hero-assets';
import {optimizedMedia} from '../src/frontend/optimized-media';

export default function Page(){
 const hero=homeHeroImages[0];
 const variants=optimizedMedia[hero];
 const initialPhoto=hero;
 const initialSrcSet=variants?.map(v=>v.src+' '+v.width+'w').join(', ');
 return <><><Client initialPhoto={initialPhoto} initialSrcSet={initialSrcSet}/><HomeAnalytics/></><nav className={dfSearchStyles.home} aria-label="꽃 주문 안내"><a href="/daejeon-flower-delivery">대전 꽃배달 안내</a><a href="/daejeon-bouquet">꽃다발 가격·사이즈 안내</a></nav></>;
}

// DF-SEARCH-METADATA
export const metadata = {
  "title": {
    "absolute": "대전꽃백화점 | 대전 동구 가오동 꽃집"
  },
  "description": "대전 동구 가오동 대전꽃백화점입니다. 꽃다발과 꽃바구니의 실제 제작 사진, 가격, 사이즈를 확인하고 매장 픽업이나 대전 꽃배달을 주문하세요.",
  "alternates": {
    "canonical": "https://xn--js0bx4ezvk5jm1b610k.com/"
  },
  "openGraph": {
    "title": "대전꽃백화점 | 대전 동구 가오동 꽃집",
    "description": "대전 동구 가오동 대전꽃백화점입니다. 꽃다발과 꽃바구니의 실제 제작 사진, 가격, 사이즈를 확인하고 매장 픽업이나 대전 꽃배달을 주문하세요.",
    "url": "https://xn--js0bx4ezvk5jm1b610k.com/",
    "type": "website",
    "locale": "ko_KR",
    "siteName": "대전꽃백화점"
  }
} as const;
