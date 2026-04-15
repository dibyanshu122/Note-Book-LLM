import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Anatya.ai Knowledge Hub"
    OLLAMA_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    CHROMA_DB_PATH: str = os.getenv("CHROMA_PATH", "./db_storage")
    UPLOAD_DIR: str = "./data"

settings = Settings()