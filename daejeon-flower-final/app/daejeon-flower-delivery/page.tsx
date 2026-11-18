import styles from '../search-landing.module.css';

const title = '대전 꽃배달 안내 – 배송 지역·비용 | 대전꽃백화점';
const description = '대전 동구 가오동 대전꽃백화점의 꽃배달 안내입니다. 꽃다발과 꽃바구니 주문 전 배송 가능 지역, 배송비, 원하는 날짜를 확인하는 방법을 알아보세요.';
const url = 'https://xn--js0bx4ezvk5jm1b610k.com/daejeon-flower-delivery';

export const metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { title, description, url, type: 'website', locale: 'ko_KR', siteName: '대전꽃백화점' },
};

export default function DeliveryGuidePage() {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>대전꽃백화점 · 대전 동구 가오동</p>
      <h1>대전 꽃배달 안내</h1>
      <p>생일이나 기념일에 맞춰 꽃다발과 꽃바구니를 보내세요. 상품을 고른 뒤 받는 곳과 희망 일정을 확인할 수 있어요.</p>
      <a className={styles.cta} href="/">상품 보고 주문하기</a>
    </header>
    <section>
      <h2>배송 가능 지역과 비용 확인</h2>
      <p>대전 지역 배송은 받는 주소와 선택한 상품, 일정에 따라 가능 여부가 달라질 수 있어요. 상품을 선택하고 주문 화면에서 <strong>배송</strong>을 선택해 받는 주소를 입력한 뒤, 배송비와 최종 결제 금액을 확인해 주세요.</p>
    </section>
    <section>
      <h2>오늘 보내고 싶다면</h2>
      <p>당일 배송은 주문 시간과 제작·배송 일정에 따라 달라요. 오늘 날짜나 원하는 시간이 보이지 않으면, 홈페이지의 상담 메뉴에서 원하는 상품과 도착 지역, 시간을 알려주세요.</p>
    </section>
    <section>
      <h2>주문 순서</h2>
      <ol><li>홈페이지에서 꽃다발이나 꽃바구니와 사이즈를 고르세요.</li><li>배송을 선택하고 날짜, 시간, 받는 곳을 입력하세요.</li><li>받는 분 정보와 카드 문구 등 요청사항을 확인한 뒤 주문하세요.</li></ol>
    </section>
    <nav aria-label="관련 안내"><a href="/daejeon-bouquet">꽃다발 가격·사이즈 안내 보기</a></nav>
  </main>;
}
