#!/bin/bash

# === 펫 건강 체커 실행 스크립트 ===
# 사용법: ./start.sh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# .env 파일 존재 확인
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
  echo "❌ backend/.env 파일이 없습니다."
  echo "   먼저 ./setup.sh 를 실행하거나, backend/.env.example 을 복사해서 만드세요:"
  echo "     cp backend/.env.example backend/.env"
  exit 1
fi
# config.py 에서 python-dotenv 로 자동 로드됩니다. AWS credentials는 ~/.aws/credentials 사용.

# 기존 프로세스 정리
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# 헬스체크 헬퍼 (최대 N초 동안 재시도)
wait_for_http() {
  local url="$1"
  local retries="${2:-15}"
  for ((i=1; i<=retries; i++)); do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [[ "$code" =~ ^(2|3|4)[0-9][0-9]$ ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# 백엔드 시작
echo "🔧 백엔드 시작 중..."
cd "$PROJECT_DIR/backend"
nohup "$PROJECT_DIR/backend/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &

if wait_for_http "http://localhost:8000/api/history" 15; then
  echo "✅ 백엔드 OK (http://localhost:8000)"
else
  echo "❌ 백엔드 실패 — server.log 확인"
  tail -20 server.log
  exit 1
fi

# 프론트엔드 시작
echo "🎨 프론트엔드 시작 중..."
nohup serve -s "$PROJECT_DIR/frontend/build" -l 3000 --no-clipboard > "$PROJECT_DIR/frontend/serve.log" 2>&1 &

if wait_for_http "http://localhost:3000" 15; then
  echo "✅ 프론트엔드 OK (http://localhost:3000)"
else
  echo "❌ 프론트엔드 실패 — serve.log 확인 (npm install -g serve 필요할 수 있음)"
  tail -20 "$PROJECT_DIR/frontend/serve.log"
  exit 1
fi

echo ""
echo "🐾 펫 건강 체커 실행 완료!"
echo "👉 브라우저에서 http://localhost:3000 접속하세요"
