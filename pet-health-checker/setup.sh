#!/bin/bash

# === 펫 건강 체커 초기 설치 스크립트 ===
# 다른 PC에서 처음 실행할 때 한 번만 수행

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🐾 펫 건강 체커 설치 시작..."

# .env 파일이 없으면 .env.example 에서 복사
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
  if [ -f "$PROJECT_DIR/backend/.env.example" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo "📝 backend/.env 파일을 생성했습니다. 본인의 API 키를 입력해주세요."
  fi
else
  echo "✓ backend/.env 파일이 이미 존재합니다."
fi

# Python venv 생성 + 의존성 설치
echo "🐍 Python 환경 설정 중..."
cd "$PROJECT_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Node 의존성 설치 + 빌드
echo "⚛️  React 빌드 중..."
cd "$PROJECT_DIR/frontend"
npm install
npx react-scripts build

# serve 설치 (글로벌)
if ! command -v serve >/dev/null 2>&1; then
  echo "📦 serve 설치 중..."
  npm install -g serve
fi

echo ""
echo "✅ 설치 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 다음 단계:"
echo ""
echo "  1. backend/.env 파일을 열어 본인의 API 키를 입력하세요:"
echo "       - OPENAI_API_KEY"
echo "       - GEMINI_API_KEY"
echo "       - JWT_SECRET (openssl rand -hex 32 로 생성 권장)"
echo ""
echo "  2. AWS credentials 설정 (Bedrock Claude 사용):"
echo "       aws configure"
echo "     또는 ~/.aws/credentials 파일을 직접 편집"
echo ""
echo "  3. 실행:"
echo "       ./start.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
