# 🐾 펫 건강 체커

반려동물(강아지/고양이) 증상을 입력하면 **Claude (Bedrock), GPT (OpenAI), Gemini (Google)** 3개 AI가 동시에 진단 결과를 제공하고, 최종 종합 요약을 제공하는 서비스입니다.

## 🧰 기술 스택

- **Backend**: FastAPI, SQLite, boto3, openai, google-genai
- **Frontend**: React 19, react-scripts
- **Auth**: JWT (python-jose), bcrypt (passlib)

---

## 👥 팀원 온보딩 (처음 클론한 경우)

### 1. 저장소 클론
```bash
git clone https://github.com/Eunji-Kim-412/team_chorus.git
cd team_chorus
git checkout <본인 브랜치명>
```

### 2. 환경 설정 파일 만들기 (각자 본인 PC에서)
```bash
cp backend/.env.example backend/.env
```

그런 다음 `backend/.env` 파일을 열어 **본인의 API 키**를 입력하세요:

```env
OPENAI_API_KEY=sk-...      # https://platform.openai.com/api-keys
GEMINI_API_KEY=AI...       # https://aistudio.google.com/apikey
AWS_REGION=us-east-1
JWT_SECRET=...             # openssl rand -hex 32 로 생성 권장
```

> ⚠️ **`backend/.env` 는 절대 Git에 커밋하지 마세요.** `.gitignore` 에 이미 포함되어 있어 실수로 커밋되지 않습니다.

### 3. AWS 자격증명 설정 (Bedrock Claude용)
```bash
aws configure
```
또는 `~/.aws/credentials` 를 직접 편집하세요. Bedrock Claude Sonnet 4.5 모델 접근 권한이 필요합니다.

### 4. 설치 & 실행
```bash
./setup.sh    # 최초 1회 (venv 생성, 의존성 설치, 프론트 빌드)
./start.sh    # 서버 실행
./stop.sh     # 서버 종료
```

실행 후 브라우저에서 http://localhost:3000 접속.

---

## 🏗️ 프로젝트 구조

```
pet-health-checker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 엔트리포인트
│   │   ├── config.py        # 환경변수 로드 (.env)
│   │   ├── llm.py           # Claude/GPT/Gemini 호출
│   │   ├── auth.py          # JWT, bcrypt
│   │   ├── database.py      # SQLite
│   │   └── models.py        # Pydantic 모델
│   ├── .env.example         # 환경변수 템플릿 (커밋됨)
│   ├── .env                 # 실제 환경변수 (⚠️ Git 제외)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── AuthPage.js      # 로그인/회원가입
│   │   ├── MainPage.js      # 진단 화면
│   │   └── api.js
│   └── package.json
├── setup.sh                  # 최초 설치
├── start.sh                  # 실행
└── stop.sh                   # 종료
```

---

## 🔐 환경변수 관리 규칙 (팀 공통)

| 항목 | 규칙 |
|------|------|
| **API 키 공유** | ❌ 절대 공유 금지, 각자 본인 키 사용 |
| **`.env` 커밋** | ❌ 절대 커밋 금지 (.gitignore로 자동 차단) |
| **새 환경변수 추가 시** | ✅ `.env.example` 에도 반드시 추가하고 커밋 |
| **팀원 간 공지** | `.env.example` 변경 시 팀 채팅에 알려주기 |

### 실수로 `.env` 를 커밋했을 경우
```bash
# 1. 즉시 히스토리에서 제거
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
git push

# 2. API 키가 노출되었으니 반드시 모든 키를 재발급받으세요.
#    - OpenAI: Dashboard → API Keys → Revoke
#    - Gemini: AI Studio → API Keys → Delete
#    - AWS: IAM → Access Keys → Deactivate/Delete
```

---

## 🌿 브랜치 전략

- `main`: 안정 버전
- `feature/*`: 기능 개발 브랜치
- 각자 브랜치에서 작업 후 PR을 통해 `main` 에 머지

## 🧪 로컬 개발 팁

- 백엔드 수동 실행 (hot reload): `cd backend && source venv/bin/activate && uvicorn app.main:app --reload`
- 프론트 개발 서버: `cd frontend && npm start`
- 로그: `backend/server.log`, `frontend/serve.log`
