
# 검색 엔진 개선 핵심 요약 보고서
검색 엔진 데모 개발 과정에서 발견된 주요 문제와와
각 문제에 대해 적용한 핵심 개선 사항 요약

---

## 1. HTML 원문에 포함된 과도한 노이즈

### 문제
- `<script>`, `<style>`, `<nav>`, `<footer>` 등 비콘텐츠 요소까지 텍스트로 추출됨  
- JavaScript 코드나 메뉴 텍스트가 검색 결과에 등장  
- 본문 대비 노이즈 비중이 높아 검색 품질 저하

### 해결
- `script`, `style`, `nav`, `footer`, `header`, `aside`, `iframe`, `noscript` 태그 제거  
- `main`, `article`, `[role="main"]` 영역을 우선 추출  
- 없을 경우 `p`, `h1~h6` 기반으로 본문 구성  
→ **본문 중심의 텍스트만 안정적으로 색인하도록 개선**

---

## 2. 비영어권 페이지가 크롤링되는 문제

### 문제
- Wikipedia 언어 선택기 링크를 따라가며 비영어 페이지까지 수집  
- 비영어 페이지가 다수 포함되며 crawl budget 낭비  
- 인덱스 언어 일관성 붕괴

### 해결
- **URL 패턴 기반 1차 필터링**
  - 비영어 Wikipedia 서브도메인 차단  
  - `/wiki/Special:`, `/wiki/Talk:` 등 특수 페이지 차단  
  - `/fr/`, `/ru/`, `/zh-cn/` 등 언어 경로 차단  
- **언어 감지 로직은 최종 백업 필터로 유지**  
→ **크롤 단계에서부터 영어 콘텐츠 중심 링크만 수집하도록 개선**

---

## 3. 중복 링크 및 중복 문서 문제

### 문제
- `page`, `page/`, `page/index.html`, `page?utm_source=...` 등을 각각 다른 페이지로 인식  
- 동일하거나 거의 동일한 문서가 여러 개 색인됨  
- 검색 결과의 다양성이 떨어지고 저장 공간 낭비 발생

### 해결
1. **URL Canonicalization(정규화) 강화**
   - hash fragment 제거  
   - default port 제거  
   - `index.html` 제거  
   - UTM, fbclid, gclid 등 tracking parameters 제거  
2. **콘텐츠 기반 Duplicate Detection**
   - 문서 텍스트를 정규화해 signature 생성  
   - 필요 시 Jaccard similarity로 near-duplicate 판단  
→ **URL 단위 + 콘텐츠 단위 두 단계에서 중복 제거**

---

## 4. 낮은 검색 관련성(TF-IDF / BM25 한계)

### 문제
- 쿼리 단어가 문서에 *한 번만* 등장해도 결과에 포함  
- footer·sidebar 등 비핵심 영역과의 매칭으로 상위 랭크  
- title, term 빈도, 문서 내 매칭 밀도 등이 반영되지 않음

### 해결
- **다단계 품질 필터 추가**
  - Minimum Term Frequency  
  - Minimum Matched Terms  
  - Minimum Score Threshold  
  - Title Boost 적용  
→ **관련성 낮은 문서는 걸러내고, 제목·본문에 강하게 연관된 문서를 상위로 배치**

---

## 5. 높은 크롤링 오류율(~90% 실패)

### 문제
- timeout, 네트워크 오류, 404, 403이 모두 하나의 오류로 취급  
- 재시도 로직이 없어 일시적 에러도 영구 실패 처리  
- 성공률이 극단적으로 낮고 크롤러가 비효율적 운영

### 해결
1. **Exponential Backoff 기반 재시도(fetchWithRetry) 도입**
   - 1초 → 2초 → 4초 증가  
2. **에러 유형 세분화 처리**
   - 404/403은 즉시 스킵  
   - timeout 및 일시적 네트워크 오류는 재시도  
3. **요청 설정 개선**
   - timeout 증가, User-Agent/Accept-Language 정비  
→ **재시도 가치가 있는 오류만 회복하고, 의미 없는 에러는 즉시 배제하도록 구조 개선**

---

## 6. PageRank 기반 권위(Authority) 반영

### 문제
- 텍스트 매칭만으로는 문서의 “신뢰성”과 “중심성”을 판단할 수 없음  
- 개인 블로그나 저품질 페이지도 키워드 일치만 잘되면 상위 랭크 가능  
- 링크 구조가 랭킹에 반영되지 않음

### 해결
1. **문서 간 링크 그래프 구축**
   - inbound/outbound 링크 정보 매핑  
2. **간소화된 PageRank 수식(power iteration) 구현**
   - damping factor 0.85 적용  
3. **검색 점수에 PageRank Boost 반영**
   - BM25/TF-IDF 점수 × (1 + PR×boost)  
→ **텍스트 관련성이 비슷한 문서 간에는 ‘많이 참조되는 문서’가 상위로 오도록 개선**

---

# 요약

- **Issue 1–3:** 노이즈 제거, 언어 필터링, 중복 제거를 통해 **색인 품질 향상**  
- **Issue 4–6:** 관련성 필터, 오류 복구, PageRank로 **검색 정확도 및 신뢰성 강화**

검색 엔진의 **크롤 → 정제 → 색인 → 랭킹** 전체 파이프라인이 균형 있게 개선되었으며,  
데모 환경에서 필요한 품질·효율·안정성을 모두 확보한 구조로 발전시켰습니다.
