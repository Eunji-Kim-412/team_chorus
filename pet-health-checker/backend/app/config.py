import os
from pathlib import Path

# backend/.env 파일 자동 로드 (팀원별 로컬 API 키)
# 파일이 없으면 조용히 무시하고 시스템 환경변수를 사용합니다.
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    # python-dotenv 미설치 시 건너뜀 (requirements.txt에 포함되어 있음)
    pass


def _warn_if_missing(name: str, example: str = "") -> str:
    """환경변수 조회 + 미설정 시 경고 출력 (필수 아님)."""
    value = os.getenv(name, "")
    if not value:
        hint = f" (예: {example})" if example else ""
        print(f"ℹ️  환경변수 {name} 미설정{hint}")
    return value


# ===== Claude 프로바이더 자동 선택 =====
# 우선순위: ANTHROPIC_API_KEY 있으면 Anthropic API, 없으면 Bedrock 사용 시도
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_PROVIDER = "anthropic" if ANTHROPIC_API_KEY else "bedrock"

# Anthropic API용 모델 ID
ANTHROPIC_MODEL_ID = os.getenv("ANTHROPIC_MODEL_ID", "claude-sonnet-4-5-20250929")
# Bedrock용 Claude 모델 ID
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-5-20250929-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# ===== OpenAI 프로바이더 자동 선택 =====
# 우선순위:
#   1. OPENAI_API_KEY 있으면 → OpenAI API 직접 사용
#   2. USE_BEDROCK_OPENAI=true 이면 → Bedrock의 gpt-oss 사용
#   3. 둘 다 없으면 → 경고만 띄우고 GPT 호출은 실패 (다른 모델은 계속 동작)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
USE_BEDROCK_OPENAI = os.getenv("USE_BEDROCK_OPENAI", "").lower() == "true"

if OPENAI_API_KEY and not OPENAI_API_KEY.startswith("sk-your"):
    OPENAI_PROVIDER = "openai"
elif USE_BEDROCK_OPENAI:
    OPENAI_PROVIDER = "bedrock"
else:
    OPENAI_PROVIDER = "none"
    print("ℹ️  GPT 비활성: OPENAI_API_KEY 또는 USE_BEDROCK_OPENAI 중 하나를 설정하세요.")

# OpenAI 모델 ID (프로바이더별)
OPENAI_MODEL_ID = os.getenv("OPENAI_MODEL_ID", "gpt-4o")
BEDROCK_OPENAI_MODEL_ID = os.getenv("BEDROCK_OPENAI_MODEL_ID", "openai.gpt-oss-120b-1:0")

# ===== Gemini =====
GEMINI_API_KEY = _warn_if_missing("GEMINI_API_KEY", "AI...")
GEMINI_MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.5-flash")

# ===== 기타 =====
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pet_health.db")

# 선택된 프로바이더 안내
print(f"🤖 Claude provider: {CLAUDE_PROVIDER}")
print(f"🤖 OpenAI provider: {OPENAI_PROVIDER}")
