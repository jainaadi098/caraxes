from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, found relative to this file so it works from any folder
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_bucket: str = "caraxes-files"
    frontend_origin: str = "http://localhost:5173"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 768

    ocr_backend: str = "paddle"  # "paddle" locally, "gemini" on hosts that can't run PaddleOCR
    demo_passcode: str = ""      # when set, every request must send it (public demos)

    github_webhook_secret: str = ""
    github_token: str = ""
    default_org_id: str = ""

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()