import {test} from 'node:test';import assert from 'node:assert/strict';import {parseNoticeText} from '../src/frontend/notice-text';
test('free OCR text separates departure and ceremony without guessing missing year or AM/PM',()=>{
 const funeral=parseNoticeText('장례식장: 예시병원 장례식장\n빈소: 특실 2호\n고인; 故 김예시님\n상주: 김가람, 김나래\n발인: 2026년 11월 23일 오전 7시 40분\n주소: 대전 동구 예시로 1\n계좌: 예시은행 123-456','funeral');
 assert.equal(funeral.fields.hall,'예시병원 장례식장');assert.equal(funeral.fields.deceasedName,'김예시');assert.equal(funeral.fields.departureDate,'2026-11-23');assert.equal(funeral.fields.departureTime,'07:40');assert.equal(funeral.fields.chiefMourner,'김가람, 김나래');assert.equal(funeral.fields.date,undefined);assert(!JSON.stringify(funeral.fields).includes('123-456'));
 const wedding=parseNoticeText('예식장: 예시컨벤션\n예식홀: 5층 그랜드홀\n신랑: 김가람\n신부: 이나래\n2026년 11월 15일\n오후 2시 20분','wedding');assert.equal(wedding.fields.date,'2026-11-15');assert.equal(wedding.fields.time,'14:20');assert.equal(wedding.fields.groom,'김가람');assert.equal(wedding.fields.departureDate,undefined);
 const uncertain=parseNoticeText('발인: 11월 23일 2시\n상주: 연락처 010-1234-5678','funeral');assert.equal(uncertain.fields.departureDate,undefined);assert.equal(uncertain.fields.departureTime,undefined);assert.equal(uncertain.fields.chiefMourner,undefined);assert(uncertain.warnings.length>=2);
 const conflict=parseNoticeText('예식 일시: 2026년 11월 15일 또는 2026년 11월 16일 오후 2시','wedding');assert.equal(conflict.fields.date,undefined);
});
