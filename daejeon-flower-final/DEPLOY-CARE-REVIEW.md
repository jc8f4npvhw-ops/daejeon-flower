# 식물 관리 가이드 통합

운영 진입점: /plant-care.html. 식물별 QR은 /plant-care.html#product-뱅갈고무나무 등의 파일 내부 주소를 사용합니다. 금전수는 #zz입니다.

홈 하단에 가이드 링크를 추가했습니다. 기존 주문/알림 서버, D1/R2 및 비밀값은 변경하지 않았습니다.

주의: wrangler.jsonc의 KAKAO_LIVE_SEND_ENABLED=false와 운영 환경의 실발송 설정이 다를 수 있으므로 배포 전 Cloudflare 현재 변수를 비교해야 합니다. PAYMENTS_ENABLED=false도 보존했습니다.

로그인 유지/아이디 저장/브라우저 비밀번호 저장 요청 UI는 업로드된 코드에 이미 있습니다. 이번 변경에서 다시 작성하지 않았습니다.

이 통합은 식물 관리 UI에 한정됩니다. 이전 대화의 모든 고객페이지 개편이 운영 코드에 통합됐다는 의미는 아닙니다. 관리자에서 관리법 내용 수정은 이 파일과 자동 연동되지 않습니다.


## 검증 결과
- TypeScript 타입 검사 통과.
- 기존 테스트 60개 중 59개 통과, 나머지 예약 테스트는 현재 달이 11월로 바뀌어 10월 예시 예약을 찾지 못했습니다. 테스트 내부 날짜를 2026-10-19로 고정한 뒤 해당 테스트도 통과했습니다.
- Cloudflare/Vinext 빌드 통과. 무료 OCR 정적 파일 준비 완료.
- 실제 Windows 글꼴 렌더링 및 운영 DB/카카오 실발송은 이 환경에서 재검증하지 않았습니다.
- Cloudflare CLI 인증 없음: 실제 배포하지 않았습니다.

## 반영 방법
1. 기존 GitHub Desktop의 daejeon-flower 저장소에서 cloudflare-latest 브랜치를 확인합니다.
2. 이 ZIP의 daejeon-flower-final 폴더 내용으로 저장소 안의 같은 폴더를 갱신합니다. .git과 기존 비밀값은 삭제하지 않습니다.
3. 자동 배포를 유발하는 Push 전에 Cloudflare 운영 변수 KAKAO_LIVE_SEND_ENABLED의 현재 값을 확인하고 wrangler.jsonc와 일치시킵니다. 이 파일의 false를 그대로 배포하면 실발송이 중단될 수 있습니다.
4. 기존 DB와 R2는 그대로 사용합니다. 새 DB 생성/초기화/데이터 삭제는 필요 없습니다.
5. GitHub 변경 파일을 확인하고 Commit/Push 후 기존 Cloudflare 빌드 결과를 확인합니다.
6. /plant-care.html, 홈 하단 진입 링크, 로그인, 실제 테스트 주문의 배송사진을 점검합니다.
