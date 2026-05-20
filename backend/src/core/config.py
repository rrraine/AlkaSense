from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    DATABASE_URL: str = ""
    APP_ENV: str = "development"
    SECRET_KEY: str = "changeme"

    class Config:
        env_file = ".env"

settings = Settings()