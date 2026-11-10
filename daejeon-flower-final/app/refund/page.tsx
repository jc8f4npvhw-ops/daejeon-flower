import {refundPolicy} from '../../src/frontend/storefront-additions';

export const metadata = {
  title: '취소·교환·환불 안내 | 대전꽃백화점',
  description: '대전꽃백화점 주문 취소, 맞춤 생화 예약, 교환 및 환불 안내입니다.',
};

const cancellationRates = [
  ['수령 4일 전 또는 그 이전', 0],
  ['수령 3일 전', 5],
  ['수령 2일 전', 10],
  ['수령 1일 전', 50],
  ['수령 당일', 100],
] as const;

export default function RefundPage() {
  const sections = refundPolicy.split('\n\n').slice(1);
  return (
    <main style={{maxWidth: 700, margin: 'auto', padding: '24px 18px 48px', color: '#1f2922', lineHeight: 1.75, wordBreak: 'keep-all'}}>
      <a href="/">← 홈으로</a>
      <h1>취소·교환·환불 안내</h1>
      {sections.map((section, i) => {
        const [title, ...paragraphs] = section.split('\n');
        return <section key={title} style={{marginTop: 24}}>
          <h2 style={{fontSize: '1.15rem'}}>{title}</h2>
          {paragraphs.map(p => <p key={p}>{p}</p>)}
          {i === 2 && <>
            <p>아래 기준은 주문별 사전 안내와 별도 동의를 거쳐 법정 청약철회 제한 요건을 충족한 맞춤 생화 예약을 고객 사정으로 수령 전에 취소할 때 적용합니다. 법령상 청약철회권이 인정되는 경우에는 아래 차감률보다 법령을 우선합니다.</p>
            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
              <caption style={{textAlign: 'left', fontWeight: 700, marginBottom: 8}}>맞춤 생화 예약 취소 기준 · 실제 결제한 상품금액 기준</caption>
              <thead><tr style={{background: '#edf1e8'}}>{['취소 요청 시점', '차감률', '환불률'].map(label => <th key={label} scope="col" style={{padding: '8px 6px'}}>{label}</th>)}</tr></thead>
              <tbody>{cancellationRates.map(([label, deduction]) => <tr key={label} style={{borderBottom: '1px solid #d7ded1'}}>
                <th scope="row" style={{padding: '8px 6px', fontWeight: 500}}>{label}</th>
                <td style={{padding: '8px 6px'}}>{deduction}%</td>
                <td style={{padding: '8px 6px'}}>{100 - deduction}%</td>
              </tr>)}</tbody>
            </table>
            <p>한국시간 기준으로 예정된 픽업일 또는 배송 수령일과 취소 요청이 접수된 날짜의 차이를 계산합니다. 예를 들어 20일 수령 예정 주문을 17일에 취소 요청하면 수령 3일 전입니다.</p>
            <p>매장 사정으로 주문을 이행하지 못하거나 상품 하자·오배송이 있는 경우 이 표를 적용하지 않습니다. 발생하지 않은 배송비는 별도로 돌려드립니다.</p>
          </>}
        </section>;
      })}
      <p><a href="tel:0422728815">매장 전화하기</a> · <a href="mailto:Daejeonflowershop@gmail.com">이메일 문의</a> · <a href="/terms">이용약관</a></p>
    </main>
  );
}
