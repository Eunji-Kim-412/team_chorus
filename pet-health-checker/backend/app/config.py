import os
from pathlib import Path

# backend/.env 파일 자동 로드 (팀원별 로컬 API 키)
# 파일이 없으면 조용히 무시하고 시스템 환경변수를 사용합니다.
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(_env_path, override=True)
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
# Bedrock용 모델 ID
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-5-20250929-v1:0")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# ===== 그 외 모델 =====
OPENAI_API_KEY = _warn_if_missing("OPENAI_API_KEY", "sk-...")
GEMINI_API_KEY = _warn_if_missing("GEMINI_API_KEY", "AI...")
OPENAI_MODEL_ID = os.getenv("OPENAI_MODEL_ID", "gpt-4o")
GEMINI_MODEL_ID = os.getenv("GEMINI_MODEL_ID", "gemini-2.5-flash")

# ===== 기타 =====
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pet_health.db")

# 선택된 Claude 프로바이더 안내
print(f"🤖 Claude provider: {CLAUDE_PROVIDER}")
