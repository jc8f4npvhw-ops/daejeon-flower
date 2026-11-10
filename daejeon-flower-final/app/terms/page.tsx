import {env} from 'cloudflare:workers';
import {loadContent} from '../../lib/server/content';
import type {Env} from '../../lib/server/types';
export const dynamic='force-dynamic';
export const metadata={title:'이용약관 | 대전꽃백화점'};
export default async function Terms(){const c=await loadContent(env as unknown as Env);return <main style={{maxWidth:700,margin:'auto',padding:24,lineHeight:1.8,color:'#1f2922'}}><a href="/register">← 회원가입으로</a><h1>서비스 이용약관</h1><div style={{whiteSpace:'pre-wrap',wordBreak:'keep-all'}}>{c.settings.terms}</div><a href="/privacy">개인정보처리방침</a> · <a href="/refund">취소·환불 안내</a></main>}
