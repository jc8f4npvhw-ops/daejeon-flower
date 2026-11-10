import {MemberPrivacyConsentContent} from '../../src/frontend/member-privacy-consent';

export const metadata={title:'회원정보 수집·이용 동의 | 대전꽃백화점',description:'대전꽃백화점 회원가입 시 수집하는 필수·선택 정보와 이용 목적, 보유기간 및 동의 거부 안내.'};

export default function MemberPrivacyConsentPage(){
 return <main style={{maxWidth:680,margin:'0 auto',padding:'24px clamp(16px, 5vw, 32px) 48px',color:'#24382c',background:'#faf9f5',lineHeight:1.7,wordBreak:'keep-all'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',paddingBottom:14,borderBottom:'1px solid #d9dfd2'}}>
   <a href="/">← 홈으로</a><strong>대전꽃백화점</strong>
  </header>
  <h1 style={{fontSize:'clamp(24px, 5vw, 32px)',lineHeight:1.4,margin:'26px 0 10px'}}>회원정보 수집·이용 동의</h1>
  <p>대전꽃백화점은 회원가입과 회원 서비스에 필요한 정보를 아래와 같이 수집·이용합니다.</p>
  <div style={{padding:'4px clamp(14px, 4vw, 24px)',border:'1px solid #d9dfd2',borderRadius:16,background:'#fff'}}>
   <MemberPrivacyConsentContent/>
  </div>
  <p><a href="/register">회원가입으로 돌아가기 →</a></p>
 </main>;
}
