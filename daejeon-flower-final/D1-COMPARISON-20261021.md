# D1 구조 비교 결과 · 2026-10-21

사용자가 기존 D1 콘솔에서 조회해 전달한 테이블 DDL과 복구 코드의 기존 SQL 및 추가 migration을 비교했다. 원격 DB에 직접 접속하거나 수정하지 않았다.

## 결과
- Cloudflare 내부 테이블 _cf_KV 제외 업무 테이블: 31개.
- 기본 SQL의 31개 업무 테이블과 비교: 컬럼, 외래키, 공백/주석 제외 CREATE TABLE 정의 차이 없음.
- 복구 코드에 포함된 추가 migration 0001~0005 적용 후 필요한 테이블: 40개.
- 부족한 테이블: admin_activity, checkout_requests, content_revisions, customer_admin_notes, delivery_quotes, order_alert_acknowledgements, order_versions, private_payment_credentials, security_login_attempts.
- 기존 주문·결제·고객·사진 테이블을 삭제하거나 교체할 필요는 발견되지 않음.
- 이번 입력은 테이블 정의만 포함하므로 원격 인덱스/트리거, 초기 상품 값, 실제 migration 이력은 확인하지 못함.
- orders DDL에 있던 한 줄 주석은 콘솔 복사 과정에서 줄바꿈이 사라져 파싱을 방해했다. 로컬 비교에 한해 해당 주석을 제거했고, 사용자 원문은 변경하지 않았다.

## 준비한 변경
- scripts/prepare-existing-d1-20261021.sql: CREATE TABLE/INDEX IF NOT EXISTS만 포함. 기존 고객·주문·상품·설정 값 UPDATE/INSERT/DELETE 없음. 원격 적용 전 상태.
- scripts/remote-schema-comparison.json: 비교 결과 구조화 기록.
- migrations/0001_storefront_extensions.sql: 예전 CEREMONY 준비중 재설정 제거. WEDDING 준비중 유지. 원본 seed SQL 전체를 원격에 재실행하지 말 것.
- tests/schema-upgrade.test.ts: 기존 SQL의 전체 업무 테이블 행과 컬럼을 보존하고, 구조 추가 SQL 두 번 실행 후 40개 테이블과 외래키 무결성 검증.

## 실제 검증
- 새 구조 추가 테스트 1개 통과.
- 변경 관련 기존 서버·상품분류·화환 공개 테스트 5개 통과.
- 직전 복구 기준본은 전체 테스트 49개와 타입 검사·빌드 통과. 전체 50개를 이번 변경 후 다시 실행했다고 주장하지 말 것.

## 다음 구현
카카오 자동발송 서버, 고객 전용 사진 확인 경로, 중복 발송 방지와 실패 처리 등은 아직 미완성이다. 현재 준비한 9개 테이블은 기존 관리자 코드가 필요로 하는 구조이며 카카오 자동발송 구현 완료를 뜻하지 않는다.
배송완료 템플릿 URL은 https://#{확인링크}이므로 변수 값에 https://가 중복되지 않게 한다.
외부 설정: 기존 SOLAPI templateId / pfId 확인 및 승인, 서버 Secret 등록, 테스트 주문 발송이 남아 있다.
