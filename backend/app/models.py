from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class Citation(BaseModel):
    id: str
    type: str # 'slide' | 'audio'
    source_title: str
    reference_label: str # e.g. "Slide 14", "18:40"
    details: Optional[str] = None

class NoteCreate(BaseModel):
    title: str = "Untitled Note"
    content: str = ""
    workspace: Optional[str] = "General"
    citations: List[Citation] = Field(default_factory=list)

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    workspace: Optional[str] = None
    citations: Optional[List[Citation]] = None

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    workspace: str
    citations: List[Citation] = Field(default_factory=list)
    word_count: int = 0
    created_at: datetime
    updated_at: datetime

class SlidePage(BaseModel):
    page_number: int
    text: str
    char_count: int

class TranscriptSegment(BaseModel):
    id: int
    start_time: float
    end_time: float
    timestamp_label: str
    text: str

class SourceMaterial(BaseModel):
    id: str
    filename: str
    file_type: str # 'pdf' | 'audio'
    file_size_bytes: int
    slide_pages: List[SlidePage] = Field(default_factory=list)
    transcript_segments: List[TranscriptSegment] = Field(default_factory=list)
    total_slides: Optional[int] = None
    duration_seconds: Optional[float] = None

class ProcessingJobCreate(BaseModel):
    note_id: Optional[str] = None
    workspace: Optional[str] = "General"

class ProcessingJobResponse(BaseModel):
    job_id: str
    note_id: Optional[str] = None
    workspace: str = "General"
    status: str # 'pending' | 'processing' | 'completed' | 'failed'
    current_stage: str
    stages_completed: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    sources: List[SourceMaterial] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

class QuizOption(BaseModel):
    id: str
    text: str
    correct: bool

class QuizQuestion(BaseModel):
    id: int
    topic: str
    question: str
    options: List[QuizOption]
    explanation: str
    source_ref: Optional[str] = None

class FlashcardItem(BaseModel):
    id: int
    term: str
    definition: str
    source_ref: Optional[str] = None

class StudySetResponse(BaseModel):
    note_id: str
    note_title: str
    quiz_questions: List[QuizQuestion] = Field(default_factory=list)
    flashcards: List[FlashcardItem] = Field(default_factory=list)

class WorkspaceRenameRequest(BaseModel):
    new_name: str

class StudyGenerationRequest(BaseModel):
    depth: Optional[str] = "simple" # "simple" | "in_depth"
    custom_prompt: Optional[str] = None

