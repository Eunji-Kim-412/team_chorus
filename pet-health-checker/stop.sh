#!/bin/bash

# === 펫 건강 체커 종료 스크립트 ===
echo "🛑 서버 종료 중..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
echo "✅ 종료 완료"
