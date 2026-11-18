import styles from '../search-landing.module.css';

const title = '대전 꽃다발 주문 – 가격·사이즈 | 대전꽃백화점';
const description = '대전 동구 가오동 대전꽃백화점에서 꽃다발을 주문하세요. 스타일별 실제 제작 사진과 가격, 사이즈를 비교하고 매장 픽업 또는 꽃배달을 선택할 수 있어요.';
const url = 'https://xn--js0bx4ezvk5jm1b610k.com/daejeon-bouquet';

export const metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', locale: 'ko_KR', siteName: '대전꽃백화점' },
};

export default function BouquetGuidePage() {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>대전꽃백화점 · 대전 동구 가오동</p>
      <h1>대전 꽃다발 주문</h1>
      <p>담백하게 마음을 전할 작은 꽃다발부터 기념일에 어울리는 풍성한 꽃다발까지, 실제 제작 사진을 보고 골라보세요.</p>
      <a className={styles.cta} href="/">꽃다발 사진·가격 보러 가기</a>
    </header>
    <section>
      <h2>가격과 실제 크기 비교하기</h2>
      <p>홈페이지에서 <strong>꽃 → 꽃다발</strong>을 누르면 대전꽃백화점과 바이닐 두 스타일을 비교할 수 있어요. 대전꽃백화점 스타일은 단정한 선물을 고를 때, 바이닐 스타일은 색감이나 포장이 돋보이는 꽃다발을 찾을 때 먼저 살펴보세요. 같은 사이즈라도 스타일에 따라 가격과 구성이 달라요. 주문 화면에서 각 옵션의 현재 가격과 실제 제작 사진을 함께 확인해 주세요.</p>
      <ul><li><strong>S:</strong> 가볍게 건네는 감사 인사나 작은 선물에 좋아요.</li><li><strong>M:</strong> 생일이나 축하 선물로 크기를 고르기 어려울 때 비교해 보세요.</li><li><strong>L 이상:</strong> 졸업식이나 기념일에 풍성한 꽃다발을 원할 때 살펴보세요.</li></ul>
    </section>
    <section>
      <h2>사진으로 비교하고 색감을 요청하는 방법</h2>
      <p>사진을 두세 장 넘겨 보며 꽃다발을 들었을 때의 크기와 포장 색을 비교해 보세요. 마음에 드는 사진이 있다면 어떤 점이 마음에 들었는지 주문 요청사항에 적어주세요. 사진 속 꽃이나 색이 꼭 필요하다면 주문 전에 상담에서 가능 여부를 확인해 주세요.</p>
    </section>
    <section>
      <h2>가오동 매장 픽업 또는 대전 꽃배달</h2>
      <p>주문할 때 픽업과 배송 중 하나를 고르고 원하는 날짜와 시간을 선택하세요. 매장에서 받으실 경우 선택 가능한 픽업 시간을 주문 화면에서 확인해 주세요.</p>
    </section>
    <nav aria-label="관련 안내"><a href="/daejeon-flower-delivery">대전 꽃배달 지역·비용 확인 방법</a> · <a href="/daejeon-graduation-bouquet">졸업식 꽃다발 크기·예약 안내</a></nav>
  </main>;
}
