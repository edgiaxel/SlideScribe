import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI: Optional[str] = os.getenv("MONGODB_URI", "").strip() or None
MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "slidescribe")
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# Processing & Upload Constraints
MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(100 * 1024 * 1024))) # 100MB
TEMP_UPLOAD_DIR: str = os.getenv("TEMP_UPLOAD_DIR", "/tmp/slidescribe_uploads")

# Faster-Whisper Model Settings
# Defaults to "base" with float32/int8 on CPU or float16 on CUDA
WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu") # default safe cpu, or cuda if available
WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

# LLM / Gemma Model Settings
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
GEMMA_MODEL: str = os.getenv("GEMMA_MODEL", "gemma3:4b")
LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
MAX_INPUT_CHARS_PER_PROMPT: int = int(os.getenv("MAX_INPUT_CHARS_PER_PROMPT", "12000"))


