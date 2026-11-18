import styles from '../search-landing.module.css';

const title = '대전 졸업식 꽃다발 – 크기·예약·픽업 안내 | 대전꽃백화점';
const description = '대전 동구 가오동에서 졸업식 꽃다발을 준비하세요. 졸업사진과 선물에 어울리는 크기, 실제 제작 사진 확인 방법, 행사 전 예약과 매장 픽업 방법을 안내합니다.';
const url = 'https://xn--js0bx4ezvk5jm1b610k.com/daejeon-graduation-bouquet';

export const metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', locale: 'ko_KR', siteName: '대전꽃백화점' },
};

export default function GraduationBouquetPage() {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>대전꽃백화점 · 대전 동구 가오동</p>
      <h1>대전 졸업식 꽃다발</h1>
      <p>졸업사진을 찍을 때 들기 편한 크기부터 여럿이 함께 준비하는 풍성한 꽃다발까지. 행사 시간에 맞춰 예약하는 방법을 안내해 드려요.</p>
      <a className={styles.cta} href="/">실제 제작 사진 보고 주문하기</a>
    </header>
    <section>
      <h2>졸업식에는 어떤 크기가 좋을까요?</h2>
      <ul>
        <li><strong>S:</strong> 어린 졸업생이 직접 들거나 친구에게 가볍게 축하를 건넬 때.</li>
        <li><strong>M:</strong> 가족과 사진을 찍을 때 얼굴이나 상반신을 많이 가리지 않는 선물을 찾을 때.</li>
        <li><strong>L 이상:</strong> 여러 사람이 함께 선물하거나 단체 사진에서 꽃다발이 눈에 띄었으면 할 때.</li>
      </ul>
      <p>홈페이지에서 <strong>꽃 → 꽃다발</strong>로 들어가 스타일과 사이즈를 고르면 실제 제작 사진과 현재 가격을 볼 수 있어요. 졸업 가운이나 옷 색을 알려주시면 색감 요청을 전하기 좋아요.</p>
    </section>
    <section>
      <h2>행사 시간에 맞춰 예약하고 받는 방법</h2>
      <ol>
        <li>졸업식 시작 시간과 행사장으로 이동하는 데 걸리는 시간을 확인해 주세요.</li>
        <li>매장에서 받으시면 주문 화면에서 <strong>픽업</strong>을 고르고, 이동 시간을 고려해 행사 전에 들를 수 있는 시간을 선택하세요.</li>
        <li>학교나 행사장으로 보내려면 <strong>배송</strong>을 고른 뒤 주소와 받는 분 연락처를 입력하고, 건네야 하는 시간이나 장소를 요청사항에 적어주세요.</li>
      </ol>
      <p>행사 날짜가 정해졌다면 주문 화면에서 원하는 시간을 미리 확인해 주세요. 가능한 시간이 보이지 않거나 특정 시각에 꼭 받아야 한다면 홈페이지의 <strong>상담</strong>에서 희망 시간을 먼저 알려주세요.</p>
    </section>
    <section>
      <h2>카드에는 어떤 말을 적으면 좋을까요?</h2>
      <p>“졸업 축하해. 너의 새 출발을 응원해!”처럼 짧게 전해도 충분해요. 카드 문구를 넣고 싶다면 주문할 때 적어주세요.</p>
    </section>
    <nav aria-label="관련 안내"><a href="/daejeon-bouquet">꽃다발 가격·사이즈 안내</a> · <a href="/daejeon-flower-delivery">대전 꽃배달 안내</a></nav>
  </main>;
}
