import type { DaejeonDistrict } from './daejeon-delivery-rates';

// 행정안전부 2026년 10월 법정동별 주민등록 인구, 각 구의 인구 상위 6개 동.
export const popularDeliveryDongs: Record<DaejeonDistrict, readonly string[]> = {
  동구: ["가양동", "용운동", "용전동", "판암동", "천동", "삼성동"],
  중구: ["태평동", "문화동", "선화동", "유천동", "목동", "산성동"],
  서구: ["둔산동", "관저동", "월평동", "갈마동", "도마동", "도안동"],
  유성구: ["지족동", "봉명동", "상대동", "관평동", "원신흥동", "전민동"],
  대덕구: ["송촌동", "법동", "중리동", "석봉동", "신탄진동", "비래동"],
};
