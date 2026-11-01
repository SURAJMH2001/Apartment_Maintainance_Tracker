from pydantic_settings import BaseSettings
from functools import lru_cache
import json

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key-here"
    DATABASE_URL: str = "sqlite:///./maintenance_tracker.db"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "Apartment Maintenance Tracker"
    APP_VERSION: str = "1.0.0"
    CORS_ORIGINS: str = '["http://localhost:5173", "http://localhost:3000"]'
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    DEFAULT_MAINTENANCE_AMOUNT: float = 3000.0
    DEFAULT_DUE_DATE_DAY: int = 5
    PENALTY_RATE: float = 0.02
    GOOGLE_CLIENT_ID: str = ""  # Set in .env: GOOGLE_CLIENT_ID=...
    
    @property
    def cors_origins_list(self) -> list[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except:
            return ["*"]

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
