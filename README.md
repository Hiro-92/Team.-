# Search Engine Rebuild
데모 규모의 웹 검색 엔진으로, 구글의 크롤러·랭커 아키텍처를 단순화하여 재구현했습니다. 

시드 URL을 입력하면,
1. **크롤러**가 HTML 페이지를 수집하고 링크를 따라가며 (깊이 제한 포함) 탐색합니다.
2. 수집한 문서를 정규화·중복 제거하고, **언어를 판별**한 뒤 허용된 언어(`ALLOWED_LANGUAGES`)만 색인합니다.
3. 문서의 토큰과 역색인(inverted index)을 구축해 **BM25 / TF-IDF** 점수로 문서를 랭킹합니다.
4. 검색 API는 점수, 스니펫, 하이라이트를 포함한 결과를 반환하고 프론트엔드가 이를 표시합니다.

---

## 프로젝트 구조

- `api/` – Express 라우터
- `controllers/` – REST 엔드포인트 컨트롤러
- `services/` – 크롤링·색인·랭킹·검색 핵심 서비스 로직
- `domain/` – 문서/포스팅 도메인 팩토리
- `models/` – 저장소 레이어(InMemory, File)
- `utils/` – URL 정규화, 토크나이저, 스니펫, 데이터 내보내기 등 유틸
- `config/` – 환경 변수, 크롤러, 랭킹 설정 모듈
- `frontend/` – Vite + React 기반 단일 페이지 UI
- `tests/` – Jest 단위/통합 테스트

---

## 실행 순서 요약

1. **크롤 요청**: `/api/crawl`에 시드 URL, 깊이, 로봇스 차단 여부를 전달합니다.
2. **문서 처리**  
   - `<html lang>` 혹은 본문 텍스트로 언어 감지  
   - 허용 언어가 아니면 스킵(`summary.skipped.language`)  
   - 중복 서명(signature) 검사 후 색인
3. **색인 저장**: `models/repositories`에서 선택한 저장소 어댑터에 문서/역색인을 저장하고, `data/` 디렉토리에 JSON·CSV 스냅샷을 갱신합니다.
4. **검색 요청**: `/api/search`에서 쿼리, 랭킹 전략, 언어를 받아 토큰화 → 후보 문서 필터링 → BM25/TF-IDF 점수 계산 → 스니펫 생성 → 결과 반환.

---

## 실행 방법

### 백엔드

```bash
cp .env.example .env      # 환경 변수 설정 (필요시 수정)
npm install
npm run dev               # 기본 포트 4000에서 Express API 실행
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 에서 UI 실행
```

Vite 개발 서버는 `frontend/vite.config.js`의 설정에 따라 `/api` 요청을 백엔드(포트 4000)로 프록시합니다.

### 주요 스크립트

| 명령 | 실행 위치 | 설명 |
| --- | --- | --- |
| `npm run dev` | 루트 | Express API를 개발 모드(기본 `http://localhost:4000`)로 실행 |
| `npm start` | 루트 | 동일한 API를 단일 명령으로 구동 (프로덕션 시뮬레이션 용도) |
| `npm test` | 루트 | Jest 기반 단위/통합 테스트 실행 |
| `npm run dev` | `frontend/` | React 개발 서버 실행 (`http://localhost:5173`) |
| `npm run build` | `frontend/` | 프런트엔드 정적 빌드 산출 |
| `npm run preview` | `frontend/` | 빌드된 프런트엔드를 로컬에서 미리보기 |

---

## 데이터 저장소 (Repository)

```js
// models/repositories/index.js
const repo = process.env.USE_REPO === 'file'
  ? require('./FileRepo')
  : require('./InMemoryRepo');
module.exports = repo;
```

- `.env` 에서 `USE_REPO=file`로 설정하면 파일 기반 어댑터(`data/store.json`)를 사용합니다.
- 기본값은 인메모리 어댑터지만, 두 어댑터 모두 매 저장 시 `data/` 폴더에 스냅샷을 갱신합니다.

스냅샷 파일:

- `data/store.json` – 저장소 전체 상태(문서 + 역색인)
- `data/documents.json` / `data/documents.csv` – 크롤링한 문서 목록
- `data/index.json` / `data/index.csv` – 역색인 토큰·포스팅 목록

---

## API 요약

- `POST /api/crawl`  
  - 요청 본문: `{ seeds: string[], depth?: number, maxPages?: number, obeyRobots?: boolean }`  
  - 응답: 크롤링 결과 요약 및 색인된 문서 식별자

- `GET /api/search`  
  - 쿼리 파라미터: `query`, `strategy=bm25|tfidf`, `page`, `size`, `lang=en|ko`  
  - 응답: `{ total, page, size, lang, items[] }`  
    - 각 아이템: `{ url, title, snippet, score, highlights }`

---

## 테스트

```bash
npm test
```

- `tests/services/ranking.strategy.test.js`: 소규모 데이터셋으로 BM25/TF-IDF 정렬 일관성 검증
- `tests/api/search.e2e.test.js`: Nock으로 페이지를 모킹하여 크롤→색인→검색 엔드투엔드 시나리오 검증

---

## 프론트엔드 UI 기능

- 크롤링 패널: 시드 URL, 깊이, 최대 페이지, 로봇스 설정 입력
- 검색 패널: 쿼리, 랭킹 전략, 언어 선택
- 결과 영역: 점수, 하이라이트, 스니펫, 언어 정보 표시 및 페이지네이션

---

## 환경 변수 및 설정

- `config/env.js`: `PORT`, `DEFAULT_RANKING`, `PAGE_SIZE`, `USE_REPO`, `MONGO_URI`, `ALLOWED_LANGUAGES` 등 로드
- `config/ranking.js`: BM25(`k1`, `b`), TF-IDF(`smoothing`, `maxBoost`) 파라미터
- `config/crawling.js`: 최대 깊이/페이지, User-Agent, robots.txt 준수 여부
- `.env`에서 `ALLOWED_LANGUAGES=en,ko`처럼 쉼표로 구분하여 허용 언어를 지정할 수 있습니다.

환경 값을 조정하면 크롤러 행동, 문서 필터링, 랭킹 가중치를 쉽게 실험할 수 있습니다.

---

## 팀 & 기여자

- Maintainer: 팀 `search-engine-rebuild` (브랜치 전략: `search-engine-rebuild` → PR → `main`)
- 협업 시 가이드
  - 변경 전 `npm test`, `npm run dev`, `cd frontend && npm run dev`로 최소 동작 확인
  - 데이터 스냅샷(`data/*.json`, `data/*.csv`)은 자동 생성되므로 커밋 제외
  - 이 README에 실행 방법/구조 변경사항을 수시로 반영

