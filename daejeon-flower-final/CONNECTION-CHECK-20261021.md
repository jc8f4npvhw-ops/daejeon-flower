배송 카카오 연결 점검 수정 — 2026-10-21

현재 오류 원인은 확정되지 않았습니다. NETWORK_RESULT_UNKNOWN은 발송 요청 처리 중 예외가 발생했다는 기록이며 네트워크 장애를 확정하는 코드는 아닙니다.

이 묶음은 앞서 보류한 로그인 유지·아이디 저장·브라우저 비밀번호 저장 요청 기능, Windows 실행 수정, 읽기 전용 SOLAPI 연결 점검을 포함합니다.

1. GitHub Desktop에서 daejeon-flower 저장소, cloudflare-latest 브랜치를 선택하고 Fetch/Pull합니다.
2. Repository > Show in Explorer로 연 저장소 폴더 안에 압축파일의 daejeon-flower-final 폴더를 덮어씁니다. 압축을 풀었던 별도 작업 폴더가 아니라 GitHub 저장소에 반영합니다.
3. 변경 파일을 Commit하고 Push origin합니다. Cloudflare의 해당 브랜치 빌드 성공을 확인합니다.
4. 관리자페이지를 새로고침하고 배송 카카오 알림 > SOLAPI 연결 점검 · 메시지 발송 없음을 누릅니다.
5. 점검 결과를 공유합니다. 현재 UNKNOWN 주문의 상태는 임의로 변경하거나 재발송하지 않습니다.

점검 API는 관리자 인증과 CSRF 검증을 통과한 요청으로 SOLAPI 잔액 API만 GET 조회합니다. 메시지를 보내거나 DB 주문 상태를 바꾸지 않고 비밀키·계정 응답 본문도 반환하지 않습니다. 연결 정상 결과만으로 템플릿·발송·고객 수신 성공이 보장되지는 않습니다.

wrangler.jsonc는 현재 서버에서 이미 켠 KAKAO_SENDING_ENABLED=true를 보존하며 KAKAO_LIVE_SEND_ENABLED=false로 테스트 수신번호 제한을 유지합니다. API Key, Secret, 테스트번호, PUBLIC_ORIGIN, SESSION_SECRET은 이 파일에 포함하지 않습니다. 기존 Cloudflare Secrets를 유지합니다.

검증: TypeScript 검사 통과, 연결 점검 및 배송 알림 관련 5개 테스트 통과, 배포용 빌드 통과. 운영 사이트 배포 및 실제 점검은 아직 미완료입니다.
