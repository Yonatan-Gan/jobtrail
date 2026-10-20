from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://jobtrail:jobtrail@localhost:5432/jobtrail"
    # Browser origins allowed to call the API. Override with a JSON list, for example
    # CORS_ORIGINS='["http://localhost:5173", "https://jobtrail.example.com"]'
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
