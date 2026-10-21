# 배송완료 연결 검증 · 2026-10-21

## 이번 최종 코드에서 실행한 검사
- 전체 테스트: 56개 통과, 실패 0 (node --import tsx --test --test-force-exit --test-concurrency=1 tests/*.test.ts).
- 타입 검사: 통과.
- production build: 통과. /delivery 경로 포함.
- wrangler deploy --dry-run --config dist/server/wrangler.json: 통과. 실제 배포 없음.
- 빌드 설정에서 기존 D1 DB, R2 MEDIA binding, 5분 cron, 기본 발송 OFF 및 테스트 제한 OFF 해제 금지 상태 확인.

## 주요 검증 범위
사진 없으면 배송완료 거부, 알림 선택한 결제 완료 배송 주문만 대기열 등록, 상태 변경과 등록의 원자성, 동시 처리 중복 방지, 완료 되돌림과 미발송 취소, 만료 링크 차단, 주문별 사진 접근 제어, 관리자 인증/CSRF, 문자 대체발송 금지, 승인된 템플릿 ID/채널 ID 및 https 변수 조합, HMAC 인증, 지정 번호 이외 발송 차단, 통신 결과 UNKNOWN 재시도 금지, 접수와 전달완료 분리, 고객 페이지 StrictMode 쿠키 교환과 토큰 제거.

## 검사 한계
SOLAPI는 테스트 대역 응답으로 검증했다. 실제 API Key로 인증하거나 실제 수신 단말로 메시지를 보내지 않았다. 실제 Cloudflare D1/R2에 변경을 적용하지 않았다. PC GitHub 원격에는 push하지 않았다. 고객 전용 사진 페이지는 DOM 기능 검사이며 실제 카카오 인앱 브라우저 확인은 남아 있다.
채널 친구 여부는 현재 고객의 확인 체크이며 카카오 API에 의한 자동 검증은 아니다. 계정·생년월일·기념일·쿠폰 전체 서버 연동은 이번 범위에서 완료되지 않았다.

## 현재 필요한 사용자 행동
이 전체 소스를 PC에 내려받아 압축을 풀고, GitHub Desktop에서 기존 daejeon-flower 저장소를 선택한 화면을 공유한다. 기존 저장소에는 이전 프로젝트 폴더가 중첩되어 있으므로 경로를 확인한 다음 새 소스를 반영한다. 그 뒤 Cloudflare 앱 생성·구조 추가 SQL·서버 Secret·테스트 번호 등록을 순서대로 진행한다. 키 값은 채팅으로 받지 않는다.
