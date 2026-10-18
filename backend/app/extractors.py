import os
import shutil
import uuid
from typing import List, Tuple
from pypdf import PdfReader
from app.models import SlidePage, TranscriptSegment
from app.config import (
    WHISPER_MODEL_SIZE,
    WHISPER_DEVICE,
    WHISPER_COMPUTE_TYPE,
    TEMP_UPLOAD_DIR
)

# Ensure temp directory exists
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

# Compatibility patch for PyAV >= 14 where metadata_errors was removed from av.open()
try:
    import av
    _orig_av_open = av.open
    def _compat_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _compat_av_open
except Exception as _patch_err:
    print(f"[extractors] av.open patch notice: {_patch_err}")

# Lazy-loaded singleton for WhisperModel
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        # Initialize with configured model size, device, and compute type
        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE
        )
    return _whisper_model

def extract_pdf_pages(file_path: str) -> List[SlidePage]:
    """
    Extracts text from each page of a PDF file, preserving 1-indexed page numbers.
    """
    reader = PdfReader(file_path)
    pages: List[SlidePage] = []
    
    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(SlidePage(
            page_number=idx,
            text=text.strip(),
            char_count=len(text.strip())
        ))
        
    return pages

def format_timestamp(seconds: float) -> str:
    """Formats seconds into MM:SS or HH:MM:SS."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def transcribe_audio_file(file_path: str) -> Tuple[List[TranscriptSegment], float]:
    """
    Transcribes an audio recording using Faster-Whisper, returning timestamped segments.
    """
    model = get_whisper_model()
    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        word_timestamps=False
    )
    
    transcript_segments: List[TranscriptSegment] = []
    for s in segments:
        label = f"{format_timestamp(s.start)} - {format_timestamp(s.end)}"
        transcript_segments.append(TranscriptSegment(
            id=s.id,
            start_time=round(s.start, 2),
            end_time=round(s.end, 2),
            timestamp_label=label,
            text=s.text.strip()
        ))
        
    return transcript_segments, round(info.duration, 2)

def save_temp_file(filename: str, content: bytes) -> str:
    """Saves uploaded bytes to a safe unique temp file."""
    ext = os.path.splitext(filename)[1].lower()
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(TEMP_UPLOAD_DIR, temp_filename)
    with open(temp_path, "wb") as f:
        f.write(content)
    return temp_path

def cleanup_temp_file(path: str):
    """Safely removes temporary file if it exists."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"[cleanup_temp_file] Warning: Failed to delete {path}: {e}")
