# 대화 요청 대조표 — 2026-11-05
기준: 이 대화에 보이는 요청의 마지막 수정 지시를 우선했습니다. 과거에 취소·변경한 지시를 다시 적용하지 않습니다.
‘코드 있음’은 운영에서 실측 검증이 끝났다는 뜻이 아닙니다. Windows 실제 렌더링, 운영 DB 내용, PG 계약, 카카오 승인 상태는 별도입니다.

## 이번 누락 복원
| 요청 | 처리/근거 |
|---|---|
| 찾는 상품 위 꽃·식물 베스트셀러 두 줄, 최대 10개, 사진으로 바로 주문 | home-discovery.tsx 추가 |
| 꽃다발 대전꽃백화점 M 1위 / 바이닐 M 2위 고정 | bestseller-ranking.ts / 순위 테스트 |
| 나머지 실제 판매량에 따라 자동 순위 | /api/public/bestsellers: 최근 90일, PAID 정상 주문 수량 합산, 60초 갱신 |
| 취소/환불/미입금 판매량 제외, 개인정보 미노출 | bestseller-ranking.test.ts DB 테스트 |
| 상황별 이미지 슬라이드, 기존 문구 유지 | 최신 확인 HTML에 있던 7장 복원, occasion-photos.ts |
| 인물 없이 사물+행동, 상황 상세와 같은 사진 크롭 | 기존 승인 이미지 사용, occasion hero에도 연결 |
| 메인 1번 사진 시작 / 3초 자동 슬라이드 | HeroPhotos, 홈 재진입 1번, 정지 버튼 |
| 꽃/식물/프로포즈 등 메뉴 글자 확대·가운데 정렬 | store.css 추가 |
| 운영 설정의 픽업시간을 홈 문구에 반영 | 기존 실시간 CMS 참조 유지 |
| 연락처 숫자 키패드·자동 하이픈 | 공통 Input 수정, DB 정규화 기존 서버 유지 |
| 메인 꽃 재진입 시 맨 아래/이전 선택 상태 문제 | routeVersion을 이용해 진입시 상세 재설정, 메뉴 선택시 giftIntent 초기화 |
| 사진 확대창 화면 밖 닫기 문제 | 기존 접근성 다이얼로그에 높이·이미지 상한·스크롤 보강 |
| 설명 줄정리 | 스타일 설명 문장 분리, 한글 단어 단위 줄바꿈 |
| 카카오 배송사진 알림 UI 강조 | Notifications 문구/배경 보강, 수신 동의 기능 유지 |
| 배송정보 입력했어요 버튼 삭제 | 삭제, 유효한 주소 입력 후 입력 영역을 벗어나면 다음 단계 이동 |
| 파일 선택 버튼·네이버 리뷰 버튼 톤 정리 | store.css 선택자 추가 |
| 발인시간 입력칸 제거 | wreath-flow/notice-import에서 숨김; 과거 저장 자료·OCR 판독은 삭제하지 않음 |
| 이번 달 서양난 | 월별 사진 목록과 두 줄 설명, 이번달만 노출 |
| 관리자에서 월별 서양난 사진·품종 설명 편집 | 상세 콘텐츠 > 이번 달 서양난 사진, 기존 CMS 저장 경로 사용 |

## 기존 운영 코드 유지 및 재검증 대상
| 요청 | 코드/검증 근거 |
|---|---|
| 꽃다발 S/M/L/XL/SPECIAL, 꽃바구니 M/L/XL/SPECIAL | size-gallery-data, size-photo-gallery |
| 사이즈북 대신 작은 사각 사진 → 확대 | size-photo-gallery, lightbox |
| 사진3장/5장 문구 제거, 사이즈·가격 확대 | 해당 숫자 문구 없음 / CSS 확대 |
| 대표 2~3장 고정 뒤 동일 스타일·사이즈 배송사진 | sizeGalleryPhotos / pinnedPhotoKeys / 정확한 SKU 테스트 |
| 스타일 선택부에서도 작은 사진 슬라이드 | StylePhotoStrip |
| 관엽·동양난·서양난·화환·프로포즈 공개 제작사진 | RecentProductPhotos / published-photos / 기존 테스트 |
| 화분 변경 가능 작은 안내 | 관엽 상품 및 이번달 서양난 안내 유지 |
| 식물 픽업·배송 모두 선택 | PlantOrder / PickupOrder |
| 배송 앞뒤 30분 안내 | delivery-time-notice |
| 기본 배송비 5,000원 + 동별 추가금 | delivery-pricing / 관리자 견적 확정, 미정 지역은 0원으로 오인하지 않음 |
| 동양난 품종 사진+가격 선택 | oriental-orchid-data, 금황/황금일향은 사진 미제공 상태이므로 임의 사진을 만들지 않음 |
| 계절 자동선택 버튼 없애기 | 최종 요청인 4가지 품종 직접 선택 UI를 우선 유지 |
| 화환 위탁/협동조합 문구 제거, 100% 새꽃 | content-upgrades, wreath-flow, celebration-story |
| 화환 아래로 자연스럽게 선택 | wreath-flow / 기존 단계 전환 |
| 부고·청첩 링크와 캡처 자동읽기, 무료 운영 | notice-reader / notice-ocr / 자가 호스팅 Tesseract |
| 읽어온 값 검토 후 적용, 비공개 캡처 | notice-import / notice-fields / R2 비공개 경로 |
| 주문 동의항목 바로 표시/체크박스 통일 | OrderConsents / 불필요한 별도 버튼 없음 |
| 클래스 문의 미리보기 화면 안 표시→복사 후 상담 | class-inquiry / 기존 테스트 |
| 프리저브드 D / 준비 중 / 마지막 대분류 | main-category-nav / storefront-additions, 개인결제 S는 후속 추가 |
| 개인고객 결제창·금액·비밀번호 | private-payment-page, admin-private-payments, 서버 접근 제어 |
| 관리자 큰 글자 / 세로 메뉴 / 오늘 주문 | admin-workspace / store.css |
| 월 예약 분포, 타임라인, 상세, 선택 주문만 인쇄 | admin-demo-data / admin-order-timeline / admin-reservation-detail |
| 완료 확인 / 제작 중 / 완료 되돌리기 | 서버 orderStatus / 기존 테스트 |
| 고객 300~400명 검색·페이지 / 500명 제한 제거 | admin-customers / 서버 페이지 처리 |
| 고객 메모 확인창 / 날짜 읽기 쉽게 | 관리자 확인 다이얼로그 / 날짜 표시 |
| 큰 휴무 달력 / 오늘 표시 / ON-OFF 확인 | admin-month-calendar / admin-workspace |
| 대분류·중분류 직관적 추가 / 사이즈 유지 | CategoryManager / catalog-structure / free-categories |
| 반복 주문 알림 / 확인까지 반복 / 소리 조절 | admin-order-alerts / order-alert-audio / 기존 테스트 |
| 사진 공개 ON-OFF 즉시 저장 / 5열·25장 페이지 / 최신 먼저 | admin-photo-controls / admin-content / 기존 테스트 |
| 로그인 30일 유지 / 아이디 저장 / 브라우저 비밀번호 저장 요청 | admin-login / auth / 기존 테스트 |
| 사진 첨부→배송완료→카카오 큐→고객 사진 링크 | 기존 서버 유지 / delivery-notifications / delivery-access |
| DB·R2 유지 / 개인정보 원본 비공개 | 기존 바인딩·스키마·권한 처리 유지 |
| 약도·가오동 홈플러스·동구청·아파트 랜드마크 / 네이버 이동 | 기존 store-location-map.png 및 StoreLocation 유지 |

## 식물 관리 페이지
9종 가이드가 들어 있는 plant-care.html과 홈 진입 링크 유지.
4가지 카드 / 물주기 상세 / 빛 5단계 / 온도계 / 위치별 밝기 / 물주기 질문 / 흙 그림 / 생활속 이야기 / 문단과 줄간격 / 제목 G마켓 산스·긴 본문 프리텐다드가 포함된 저장본을 사용했습니다.
식물관리 페이지를 관리자에서 편집하는 기능은 요청 범위와 별개이며 자동 연동되지 않습니다.

## 아직 연결·확정이 필요한 사항 (완료로 표시하지 않음)
- 실제 카드결제: PAYMENTS_ENABLED=false 유지. PG 계약·키·운영정책 준비가 끝나야 실제 결제 가능.
- 카카오: 현재 확인한 설정은 테스트번호만 전송(false). 실제 고객 발송 개시는 별도 운영 전환.
- 리뷰 작성 확인→다음 이용 1,000원 쿠폰 자동발행: 이번 파일에서 신규 구현하지 않았으며, 네이버 리뷰 작성 완료를 링크 클릭만으로 확인할 수 없음. 운영 방식 확정 필요.
- 기념일 D-3 자동 카카오 발송·쿠폰: 등록 UI와 날짜 처리만으로 자동 발송 완료라고 표시하지 않음. 템플릿/발송 연결 검증 필요.
- 3일 전 70% / 하루 전 50% / 당일 환불 불가: 기존 코드에 검토안으로 남아 있음. 보편적인 법정 권리를 무시하는 자동 공제로 배포하지 않음. 적용 대상·4일 이전·별도 동의·확정문구 확인 필요.
- 주문/사진/상품은 운영 DB 내용이 권위 있음. 확인용 HTML의 예시 주문·고객을 실제 DB에 복사하지 않음.
- R2의 기존 상품 사진 누락·실제 모자이크 상태는 이번 로컬 코드 검사만으로 확인 불가.
- www 포함 도메인 접속은 Cloudflare 도메인/경로 설정 문제로 코드 ZIP만으로 완료할 수 없음.
