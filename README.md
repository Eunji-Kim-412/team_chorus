# 펫 증상 상담 서비스 — 팀원 인수인계

## 서비스 개요

반려동물 보호자가 증상을 설명하면 Claude, ChatGPT, Gemini, Llama 4개의 AI가 동시에 추가 질문을 하고, 충분한 정보가 모이면 각 AI가 진단을 내리는 서비스.

**핵심 UX 흐름:**
```
증상 입력 (전체 전송)
    ↓
각 AI와 개별 문답 (라디오 버튼으로 하나씩 선택)
    ↓
진단 받기 클릭 (전체 전송)
    ↓
각 AI 진단 + 종합 분석 패널 자동 생성
    ↓
부족하면 "추가 문답하기"로 다시 Q&A
```

---

## 현재 완성된 것 (Ellie 담당)

- [x] 4-패널 레이아웃 (Claude / ChatGPT / Gemini / Llama)
- [x] 증상 입력 → 4개 동시 전송
- [x] 라디오 버튼 패널 선택 (하나 클릭 → 나머지 해제)
- [x] 각 AI와 개별 멀티턴 문답
- [x] 크로스 컨텍스트: 다른 AI와 나눈 대화를 시스템 프롬프트에 공유
- [x] 진단 요청 → 4개 동시 전송 ("가장 유력한 원인 + 판단 이유" 형식)
- [x] 종합 분석 패널: 진단 완료 후 자동 생성 (공통 원인 / 각 AI 소견 / 위험도)
- [x] 추가 문답하기: 진단 후 Q&A 모드로 돌아가기
- [x] 증상 요약 버튼 (📋 증상 요약)
- [x] 대화 히스토리 (localStorage 저장)
- [x] 사이드바

---

## 팀원이 이어서 할 것

### 우선순위 1 — 진단 화면 개선
진단 결과가 지금은 각 LLM 패널에 텍스트로만 나와요. 더 읽기 좋게 구조화 필요:

- [ ] 진단 결과 카드 UI (위험도별 색상, 원인/이유/조치 구분해서 표시)
- [ ] 종합 분석 패널 디자인 개선 (`components/DiagnosisPanel.tsx`)

### 우선순위 2 — 1단계 연결 (반려동물 정보 입력)
팀의 다른 팀원이 만들고 있는 반려동물 정보 입력 폼과 연결:
- 이름, 종, 나이, 체중 등을 받아서 시스템 프롬프트에 포함
- `app/page.tsx`의 `buildSystemPrompt()` 함수에 petInfo 파라미터 추가하면 됨

### 우선순위 3 — 이후 스텝
- [ ] 4단계: 해야 할 것 / 하면 안 되는 것 정리 화면
- [ ] 5단계: 병원 지도 (카카오맵 or 네이버맵 API)

---

## 로컬 실행 방법

```bash
# 1. 의존성 설치
cd pet-app
npm install

# 2. 환경변수 설정 (.env.local 파일 직접 만들기)

# 3. 실행
npm run dev
# → http://localhost:3000
```

### .env.local 형식
```
GROQ_API_KEY=여기에_키_입력
ANTHROPIC_API_KEY=여기에_키_입력
GEMINI_API_KEY=여기에_키_입력
OPENAI_API_KEY=여기에_키_입력
```

> `.env.local` 파일은 깃헙에 올라가지 않아요. 직접 만들어서 키를 넣어주세요.

### 현재 API 키 상태
| LLM | 상태 | 비고 |
|-----|------|------|
| Groq (Llama) | ✅ 정상 작동 | |
| Anthropic (Claude) | ⚠️ 크레딧 충전 필요 | console.anthropic.com |
| Gemini | ⚠️ 쿼터 초과 | 무료 한도 소진 |
| OpenAI (ChatGPT) | ❌ 키 없음 | mock 응답 중 |

**API 키가 없거나 오류 나도 mock 응답으로 대체되므로 개발은 가능합니다.**

---

## 주요 파일 구조

```
pet-app/
├── app/
│   ├── page.tsx                    ← 메인 (상태 관리, 전체 흐름)
│   └── api/
│       ├── chat/
│       │   ├── claude/route.ts     ← Anthropic API
│       │   ├── chatgpt/route.ts    ← OpenAI API
│       │   ├── gemini/route.ts     ← Google Gemini API
│       │   └── llama/route.ts      ← Groq API (Llama 3.3 70B)
│       ├── summarize/route.ts      ← 증상 요약 (Claude 사용)
│       ├── diagnose-summary/route.ts ← 진단 종합 분석 (Groq 사용)
│       └── test-keys/route.ts      ← API 키 상태 확인용
├── components/
│   ├── LLMPanel.tsx                ← 각 AI 채팅 패널
│   ├── SymptomInput.tsx            ← 증상 입력창
│   ├── SummaryPanel.tsx            ← 증상 요약 패널
│   ├── DiagnosisPanel.tsx          ← 진단 종합 분석 패널 ← 여기 개선
│   └── Sidebar.tsx                 ← 대화 히스토리
└── lib/
    └── getApiKey.ts                ← env var 직접 읽기 유틸
```

---

## 핵심 로직 설명

### 크로스 컨텍스트 (cross-context)
각 AI에게 답변을 보낼 때, **다른 AI들과 나눈 대화 내용**을 시스템 프롬프트에 포함시킵니다.
→ 예: Llama에게 답변할 때, Claude/ChatGPT/Gemini와의 대화 요약이 Llama의 시스템 프롬프트에 들어감
→ 이미 확인된 정보를 다시 묻지 않게 됨

### 패널 선택 방식
- 첫 메시지: 4개 전체 자동 전송
- 후속 메시지: 클릭한 패널 1개에만 전송 (라디오 버튼)
- 진단 요청: 4개 전체 자동 전송

### step 상태
- `symptom-qa`: 증상 문답 모드 (입력창 노출)
- `diagnosis`: 진단 결과 모드 (종합 분석 패널 노출)
