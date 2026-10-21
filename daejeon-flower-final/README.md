# 대전꽃백화점 고객·관리자 작업 프로젝트

2026-10-21 배송완료 카카오 코드 추가. 실제 발송/운영 오픈 전 상태입니다. 최신 연결 순서와 미완료 범위는 **KAKAO-DELIVERY-SETUP-20261021.md**를 먼저 읽어주세요.
기존 D1 비교를 마쳤으며, 아래 과거 초기 설정 설명보다 위 최신 안내가 우선합니다.

이 폴더가 이 대화에서 작업한 최신 소스입니다. PC의 기존 중간확인 프로젝트를 복사하거나 덮어쓸 필요가 없습니다.
고객 화면, `/admin`, `/payment`, `/api/*`가 하나의 Cloudflare Workers 프로젝트로 배포됩니다.

## 기존 인프라

- Worker 이름: `daejeon-flower` (배포 전에 계정의 같은 이름 Worker가 맞는지 확인)
- D1: `daejeon-flower-db` / `48c72584-adf3-4802-845e-4b2601ddcd6e` / binding `DB`
- R2: `daejeon-flower-media` / binding `MEDIA`
- 실 도메인: `대전꽃백화점.com`
- `wrangler.jsonc`에 기존 D1 ID와 R2 버킷이 설정되어 있습니다. DB나 버킷 생성 명령을 실행하지 않습니다.

## 준비와 배포 순서

Node.js 24 LTS에서 새 폴더를 연 뒤 실행합니다.

```sh
npm ci
npx wrangler login
npm run typecheck
npm test
npm run check:vinext
```

`vinext check` → `vinext init`은 이 최종 프로젝트에서 이미 수행했습니다. 생성된 `vite.config.ts`와 `wrangler.jsonc`에 기존 바인딩을 추가했고, 캐시용 DB/R2를 자동 생성하지 않는 설정을 사용했습니다. init을 다시 실행할 필요는 없습니다.

기존 D1에 추가 변경만 반영합니다.

```sh

# 원격 DB 준비는 KAKAO-DELIVERY-SETUP-20261021.md의 확인된 추가 SQL만 사용
npm run media:upload
npm run build:vinext
npm run deploy:vinext
npm run secret:session
npm run admin:create
```

- `migrations/0001_storefront_extensions.sql`: 보안 시도 제한, 저장 이력, 배송비 견적, 결제 요청 중복 방지, 주문 버전/처리 잠금 테이블을 추가합니다. 트렁크를 상담형으로, 웨딩을 준비 중으로 변경합니다. 화환은 준비 중으로 되돌리지 않습니다. 기존 테이블을 삭제하지 않습니다.
- `tests/existing-D1-FINAL.sql`은 자동 테스트 전용 원본 스키마입니다. 원격 DB에 다시 실행하지 마세요.
- `media:upload`는 포함된 132개 이미지 자산을 **기존 R2** `public/seed/` 경로로 옮기고 D1 `media`와 상품사진 연결을 등록합니다. 같은 파일은 같은 해시 키를 사용합니다. 원본 상품·사이즈 분류를 보존합니다.
- `secret:session`은 무작위 세션키를 서버 비밀값으로 넣습니다. 값을 출력하거나 파일로 남기지 않습니다.
- `admin:create`는 아이디/표시이름/권한/비밀번호를 묻습니다. 비밀번호는 숨겨 입력받고 PBKDF2 해시만 저장합니다. 같은 아이디면 비밀번호와 권한을 갱신하고 이전 세션을 종료합니다. 기본 비밀번호는 없습니다.
- `/admin`에서 로그인해 카카오톡 채널 URL과 실제 운영 약관을 입력하세요.

위 명령은 이 작업 환경에서 원격으로 실행하지 않았습니다. 본인 Cloudflare 계정에서 실행해야 합니다. 실 DNS나 기존 Worker를 수정하지 않은 상태입니다.

## 관리자 사용

상단의 `저장하고 적용`을 눌러야 고객 화면에 반영됩니다. 다른 관리자가 먼저 저장하면 덮어쓰지 않고 충돌을 안내합니다.

- 상품: 이름·설명·노출·상담/주문·사이즈별 가격·옵션 노출, 관엽식물 추가.
- 옵션의 **표시 이름**은 바꿀 수 있지만 주문·DB 연결에 쓰는 내부 코드는 유지합니다.
- 사진: 상품 → 정확한 스타일/사이즈 선택 → 사진 추가/교체/순서 이동/대표 지정/제거. 삭제는 연결만 제거하며 R2 원본을 자동 삭제하지 않습니다.
- 문구: 메인 문구, 두 스타일 소개, 화면별 제목/설명, 메인·분류·프로필 사진.
- 메뉴 공개: 웨딩/화환 준비 중 안내와 공개 후 소개. 준비 중이면 직접 진입·상황 추천·예산 검색의 주문 경로가 함께 닫힙니다.
- 주문: 결제 완료 주문만 접수 목록에 표시. 신규 → 제작 중 → 픽업/배송 완료. 배송 완료에는 사진이 필요합니다.
- 배송비 확인: 고객 요청의 주소를 보고 금액 확정 후 결제 링크를 만들어 복사합니다. 고객에게 자동 발송되지는 않습니다.
- 운영 설정: 픽업 시작/마감, 추후 24시간 픽업 허용, 전화·네이버·카카오 URL, 약관.
- 백업: 사진·상품·문구 JSON 백업. 주문자 개인정보를 백업에 넣지 않습니다.
- `DRIVER`는 배송 주문 조회·사진 등록·배송 완료 권한만 있습니다. 서버에서도 같은 권한을 확인합니다.

로컬 단일 HTML 검토본은 IndexedDB에 수정 내용을 저장하며 다른 기기와 동기화되지 않습니다. 실제 배포 프로젝트는 동일 출처 `/api`를 사용하고 D1·R2에 저장합니다. 관리자 UI에서 서버 비밀키를 입력받지 않습니다.

## DB 구조와 데이터 일관성

기존 `products`, `product_styles`, `product_variants`, `product_media`, `media`, `admin_users`, `admin_sessions`, `orders`, `order_items`, `order_item_messages`, `order_consents`, `payments`를 사용합니다.

화면 구성·대표사진·공개 상태·문구는 `content_blocks`의 `STOREFRONT_V1`에 버전이 있는 JSON으로 보관합니다. 가격/판매 상태와 사진 연결은 기존 정규 테이블에도 같은 D1 batch에서 동기화합니다. 이미지 바이트는 R2에만 저장하며 JSON과 D1에는 URL/키만 저장합니다. 사진 업로드 후 저장 충돌이 나면 미사용 R2 객체가 남을 수 있지만 사용 중인 사진을 삭제하지 않습니다.

상품사진: `public/seed/`, `public/uploads/`.
배송사진: `private/uploads/`, 관리자 세션으로만 읽을 수 있습니다.

## 결제 연결

PG가 아직 확정되지 않아 실결제는 기본 **꺼짐**입니다. 토스페이먼츠 v2 위젯용 서버 어댑터를 포함했습니다. 다른 PG를 선택하면 `lib/server/orders.ts`의 결제 어댑터와 `/payment`를 해당 PG에 맞춰 교체해야 합니다.

토스를 사용한다면:

```sh
npx wrangler secret put TOSS_CLIENT_KEY
npx wrangler secret put TOSS_SECRET_KEY
```

관리자 운영 설정에서 실제 개인정보처리방침·이용약관·취소/환불 안내를 저장합니다. 테스트 키로 승인·실패·취소를 확인한 뒤 `wrangler.jsonc`의 `PAYMENTS_ENABLED`를 `"true"`로 바꾸고 배포합니다. 마지막으로 관리자 `연동·오픈 준비`에서 실결제 사용을 켭니다.

웹훅: `https://실제도메인/api/payments/webhook`.
성공 콜백: `/payment`. 주문 ID/금액/결제키와 링크 토큰을 서버에서 확인한 뒤 PG에 승인 요청합니다. 웹훅도 PG 조회 결과를 확인하고 처리합니다. 브라우저에서 전달한 총액은 신뢰하지 않습니다. 승인 확인 전에는 관리자 신규 주문으로 보여주지 않습니다. 취소는 PG의 확인 결과가 있어야 환불 상태로 저장합니다.

배송은 금액 미확정 상태로 결제시키지 않습니다. 배송비 확인 요청 → 관리자 금액 확정/링크 전달 → 고객 금액 확인 → 결제로 이어집니다. 연락은 현재 전화 또는 수동 링크 전달이며 알림톡 자동 발송은 별도 제공자/템플릿 연결이 필요합니다.

## 도메인 전환

먼저 Worker의 `workers.dev` 주소에서 실기기·테스트 결제를 확인하세요. 이후 Cloudflare Workers의 Custom Domains에서 `대전꽃백화점.com`을 연결합니다. 충돌하는 루트 DNS 레코드가 있다면 현재 남은 가비아 A 레코드 `121.254.178.253`을 정리하고 Cloudflare가 안내하는 Custom Domain 구성을 사용합니다. 기존 IP를 이 프로젝트에 하드코딩하지 않았습니다.

## 검증과 남은 실제 연결

이 코드에 대해 타입 검사, vinext 호환성 검사, 프로덕션 빌드, 기존 D1 SQL을 사용한 SQLite 테스트, 관리자/고객 DOM 동작 테스트를 수행했습니다. 검증 범위는 `검증결과.md`를 참고하세요.

실제 Cloudflare 계정 배포, 원격 DB/R2 업로드, 관리자 최초 등록, 실 PG 승인/취소, 실제 기기의 화면 확인은 아직 실행하지 않았습니다. 그 전에는 운영 오픈 완료로 볼 수 없습니다. 쿠폰·회원/소셜 로그인·AI 게시물 발행은 실제 연결 전입니다. 배송완료 알림톡 코드는 2026-10-21 추가했지만 서버 설정·실제 발송 테스트는 남아 있습니다.

공식 참고: https://github.com/cloudflare/vinext / https://vinext.dev/docs/deploying/cloudflare / https://docs.tosspayments.com/guides/v2/payment-widget/integration
