import Client from './client';
import HomeAnalytics from './home-analytics';
import searchStyles from './search-landing.module.css';
import { homeHeroImages } from '../src/frontend/home-hero-assets';
import { optimizedMedia } from '../src/frontend/optimized-media';

const siteName = '대전꽃백화점';
const title = '대전꽃백화점 | 대전 동구 가오동 꽃집';
const description = '대전 동구 가오동에서 꽃다발과 꽃바구니를 직접 만드는 대전꽃백화점입니다. 실제 제작 사진과 가격을 살펴보고, 매장 픽업이나 대전 꽃배달을 예약하실 수 있습니다.';
const homeUrl = 'https://xn--js0bx4ezvk5jm1b610k.com/';

// DF-SEARCH-METADATA
export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: homeUrl },
  icons: { icon: homeUrl + 'favicon.ico' },
  openGraph: {
    title,
    description,
    url: homeUrl,
    type: 'website',
    locale: 'ko_KR',
    siteName,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
} as const;

export default function Page() {
  const initialPhoto = homeHeroImages[0];
  const variants = optimizedMedia[initialPhoto];
  const initialSrcSet = variants?.map(variant => variant.src + ' ' + variant.width + 'w').join(', ');

  return (
    <>
      <>
        <Client initialPhoto={initialPhoto} initialSrcSet={initialSrcSet} />
        <HomeAnalytics />
      </>
      <nav className={searchStyles.home} aria-label="꽃 주문 안내">
        <a href="/daejeon-flower-delivery">대전 꽃배달 안내</a>
        <a href="/daejeon-bouquet">꽃다발 가격·사이즈 안내</a>
      </nav>
    </>
  );
}
