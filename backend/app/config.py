import os

class Settings:
    PROJECT_NAME: str = "SmartCheck AI"
    API_V1_STR: str = "/api/v1"
    
    # Database
    _db_url = os.getenv("DATABASE_URL", "sqlite:///./smartcheck.db")
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = _db_url
    
    # JWT Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforsmartcheckai2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

settings = Settings()
