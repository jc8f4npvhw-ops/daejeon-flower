import {env} from 'cloudflare:workers';
import {loadContent} from '../../lib/server/content';
import type {Env} from '../../lib/server/types';
import {PrivacyDocument} from '../../src/frontend/privacy-policy';
export const dynamic='force-dynamic';
export const metadata={title:'개인정보처리방침 | 대전꽃백화점',description:'대전꽃백화점 개인정보 처리 목적, 보유기간, 권리 행사 및 개인정보 보호책임자 안내.'};
export default async function PrivacyPage(){const content=await loadContent(env as unknown as Env);return <PrivacyDocument text={content.settings.privacy}/>}
