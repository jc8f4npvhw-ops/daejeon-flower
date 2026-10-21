SOLAPI 연결 오류 수정 — 2026-10-21

원인: lib/server/solapi.ts에서 사용한 redirect:error는 Cloudflare Workers에서 지원하지 않아 요청 전 TypeError가 발생합니다. 기존 네트워크 예외 기록은 이 원인으로 재현됩니다. redirect:manual로 수정하여 인증 헤더를 다른 주소에 자동 전달하지 않고 응답 상태를 확인하도록 유지합니다.

이 묶음은 이미 배포한 로그인/연결점검 수정 위에 추가하는 수정입니다. DB, R2, 비밀키, 주문 상태는 변경하지 않습니다.

GitHub Desktop에서 daejeon-flower 저장소의 cloudflare-latest 브랜치를 Fetch/Pull한 뒤 Repository > Show in Explorer로 폴더를 열고, 압축 안의 daejeon-flower-final 폴더를 덮어씁니다. Commit 후 Push origin합니다. Cloudflare 배포 성공 후 관리자 Ctrl+F5, 배송 카카오 알림 > SOLAPI 연결 점검 버튼을 누릅니다.

연결 점검은 메시지를 보내지 않습니다. 결과를 확인하기 전 기존 UNKNOWN 주문 상태를 수동 변경하거나 새 테스트 주문을 만들어 재발송하지 않습니다.

검증: Cloudflare Workers 실행환경에서 기존 옵션 TypeError 재현, 수정된 실제 SOLAPI GET/POST 요청 생성 검사 통과(외부 메시지 발송 없이 검증). 관련 6개 테스트와 TypeScript 검사, 배포 빌드 통과. 실제 서버 배포와 SOLAPI 인증·템플릿 발송·사진 링크 고객 열람은 추가 확인 필요.
