from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    google_places_api_key: str
    openroute_api_key: Optional[str] = None
    redis_url: str = "redis://localhost:6379"

    class Config:
        env_file = ".env"

settings = Settings()
