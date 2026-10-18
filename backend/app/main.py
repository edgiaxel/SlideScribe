import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.models import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    ProcessingJobResponse,
    SourceMaterial,
    Citation,
    StudySetResponse,
    WorkspaceRenameRequest,
    StudyGenerationRequest
)
from app.storage import storage
from app.config import (
    MONGODB_URI,
    MAX_FILE_SIZE_BYTES,
    WHISPER_MODEL_SIZE,
    WHISPER_DEVICE,
    WHISPER_COMPUTE_TYPE
)
from app.extractors import (
    extract_pdf_pages,
    transcribe_audio_file,
    save_temp_file,
    cleanup_temp_file
)

app = FastAPI(
    title="SlideScribe API",
    description="Backend API for lecture note taking, document extraction, and study companion.",
    version="0.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "database": "mongodb_atlas" if storage.is_mongo_configured() else "local_memory",
        "mongodb_configured": bool(MONGODB_URI),
        "whisper": {
            "model_size": WHISPER_MODEL_SIZE,
            "device": WHISPER_DEVICE,
            "compute_type": WHISPER_COMPUTE_TYPE
        }
    }

# --- Notes CRUD ---

@app.get("/api/notes", response_model=List[NoteResponse])
async def get_notes():
    return await storage.list_notes()

@app.post("/api/notes", response_model=NoteResponse, status_code=201)
async def create_note(payload: NoteCreate):
    return await storage.create_note(payload)

@app.get("/api/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    note = await storage.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.put("/api/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, payload: NoteUpdate):
    note = await storage.update_note(note_id, payload)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    deleted = await storage.delete_note(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"status": "deleted", "id": note_id}

# --- Import & Processing Pipeline ---

SUPPORTED_PDF_EXTENSIONS = {".pdf"}
SUPPORTED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".aac", ".ogg", ".flac"}

@app.post("/api/process-materials", response_model=ProcessingJobResponse)
async def process_materials(
    files: List[UploadFile] = File(...),
    note_id: Optional[str] = Form(None),
    workspace: Optional[str] = Form("General")
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    # 1. Create a tracking job
    job = await storage.create_job(note_id=note_id, workspace=workspace or "General")
    job_id = job["job_id"]
    
    stages_completed = []
    sources: List[SourceMaterial] = []
    temp_paths_to_clean: List[str] = []

    try:
        # Stage 1: Validation
        await storage.update_job(job_id, {"status": "processing", "current_stage": "validating_files"})
        
        for upload_file in files:
            filename = upload_file.filename or "unknown"
            ext = os.path.splitext(filename)[1].lower()

            if ext not in SUPPORTED_PDF_EXTENSIONS and ext not in SUPPORTED_AUDIO_EXTENSIONS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format '{ext}' for file '{filename}'. Supported: PDF, MP3, M4A, WAV, AAC, OGG, FLAC."
                )

            # Read content and enforce size limits
            content = await upload_file.read()
            size = len(content)
            if size == 0:
                raise HTTPException(status_code=400, detail=f"Uploaded file '{filename}' is empty.")
            if size > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{filename}' ({size / (1024*1024):.1f}MB) exceeds maximum limit of {MAX_FILE_SIZE_BYTES / (1024*1024):.0f}MB."
                )

            # Save to temporary storage for processing
            temp_path = save_temp_file(filename, content)
            temp_paths_to_clean.append(temp_path)

        stages_completed.append("validating_files")

        # Stage 2: Processing Files
        has_pdf = any(os.path.splitext(f.filename or "")[1].lower() in SUPPORTED_PDF_EXTENSIONS for f in files)
        has_audio = any(os.path.splitext(f.filename or "")[1].lower() in SUPPORTED_AUDIO_EXTENSIONS for f in files)

        for idx, upload_file in enumerate(files):
            filename = upload_file.filename or "unknown"
            ext = os.path.splitext(filename)[1].lower()
            temp_path = temp_paths_to_clean[idx]
            file_size = os.path.getsize(temp_path)

            if ext in SUPPORTED_PDF_EXTENSIONS:
                await storage.update_job(job_id, {
                    "current_stage": f"extracting_slides:{filename}",
                    "stages_completed": stages_completed
                })
                try:
                    pages = extract_pdf_pages(temp_path)
                except Exception as e:
                    raise HTTPException(status_code=422, detail=f"Failed to extract text from PDF '{filename}': {str(e)}")

                sources.append(SourceMaterial(
                    id=f"src-pdf-{idx+1}",
                    filename=filename,
                    file_type="pdf",
                    file_size_bytes=file_size,
                    slide_pages=pages,
                    total_slides=len(pages)
                ))
                if "extracting_slides" not in stages_completed:
                    stages_completed.append("extracting_slides")

            elif ext in SUPPORTED_AUDIO_EXTENSIONS:
                await storage.update_job(job_id, {
                    "current_stage": f"transcribing_audio:{filename}",
                    "stages_completed": stages_completed
                })
                try:
                    segments, duration = transcribe_audio_file(temp_path)
                except Exception as e:
                    raise HTTPException(status_code=422, detail=f"Failed to transcribe audio '{filename}': {str(e)}")

                sources.append(SourceMaterial(
                    id=f"src-audio-{idx+1}",
                    filename=filename,
                    file_type="audio",
                    file_size_bytes=file_size,
                    transcript_segments=segments,
                    duration_seconds=duration
                ))
                if "transcribing_audio" not in stages_completed:
                    stages_completed.append("transcribing_audio")

        stages_completed.append("materials_associated")

        # Stage 3: Structured Note Generation via Gemma
        await storage.update_job(job_id, {
            "current_stage": "generating_structured_notes",
            "stages_completed": stages_completed
        })

        primary_name = files[0].filename or "Lecture"
        base_name = os.path.splitext(primary_name)[0].replace("_", " ")
        note_title = f"{base_name} - Structured Notes"

        from app.generator import generate_structured_note
        generated_html, citations = await generate_structured_note(sources, title_hint=note_title)
        stages_completed.append("generating_structured_notes")

        # Stage 4: Persist or Update Note
        associated_note_id = note_id
        if not associated_note_id:
            new_note = await storage.create_note(NoteCreate(
                title=note_title,
                content=generated_html,
                workspace=workspace or "General",
                citations=citations
            ))
            associated_note_id = new_note.id
        else:
            existing_note = await storage.get_note(associated_note_id)
            if existing_note:
                updated_citations = existing_note.citations + citations
                await storage.update_note(associated_note_id, NoteUpdate(
                    content=generated_html,
                    citations=updated_citations
                ))

        stages_completed.append("note_persisted")

        # Mark job as completed
        completed_job = await storage.update_job(job_id, {
            "status": "completed",
            "note_id": associated_note_id,
            "current_stage": "completed",
            "stages_completed": stages_completed,
            "sources": [s.model_dump() for s in sources]
        })
        
        if not completed_job:
            raise HTTPException(status_code=404, detail="Processing job not found")

        return ProcessingJobResponse(**completed_job)

    except HTTPException as he:
        await storage.update_job(job_id, {
            "status": "failed",
            "error_message": he.detail,
            "current_stage": "failed"
        })
        raise he
    except Exception as e:
        error_msg = f"Unexpected processing failure: {str(e)}"
        await storage.update_job(job_id, {
            "status": "failed",
            "error_message": error_msg,
            "current_stage": "failed"
        })
        raise HTTPException(status_code=500, detail=error_msg)
    finally:
        # Lifecycle cleanup of all temporary uploaded files
        for path in temp_paths_to_clean:
            cleanup_temp_file(path)

@app.get("/api/jobs/{job_id}", response_model=ProcessingJobResponse)
async def get_processing_job(job_id: str):
    job = await storage.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return ProcessingJobResponse(**job)

# --- Workspaces Management ---

@app.put("/api/workspaces/{workspace_name}")
async def rename_workspace(workspace_name: str, payload: WorkspaceRenameRequest):
    count = await storage.rename_workspace(workspace_name, payload.new_name)
    return {"modified_count": count, "workspace": payload.new_name}

@app.delete("/api/workspaces/{workspace_name}")
async def delete_workspace(workspace_name: str):
    count = await storage.delete_workspace(workspace_name)
    return {"deleted_count": count, "workspace": workspace_name}

# --- Study Materials Generation ---

@app.get("/api/notes/{note_id}/study", response_model=StudySetResponse)
async def get_study_materials(note_id: str):
    note = await storage.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    cached = await storage.get_study_set(note_id)
    if cached:
        return StudySetResponse(**cached)

    try:
        from app.generator import generate_study_set
        study_set = await generate_study_set(
            note_id=note.id,
            note_title=note.title,
            note_content=note.content,
            citations=note.citations
        )
        await storage.save_study_set(note_id, study_set.model_dump())
        return study_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study materials: {str(e)}")

@app.post("/api/notes/{note_id}/study", response_model=StudySetResponse)
async def regenerate_study_materials(note_id: str, payload: Optional[StudyGenerationRequest] = None):
    note = await storage.get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    depth = payload.depth if payload and payload.depth else "simple"
    custom_prompt = payload.custom_prompt if payload and payload.custom_prompt else None

    try:
        from app.generator import generate_study_set
        study_set = await generate_study_set(
            note_id=note.id,
            note_title=note.title,
            note_content=note.content,
            citations=note.citations,
            depth=depth,
            custom_prompt=custom_prompt
        )
        await storage.save_study_set(note_id, study_set.model_dump())
        return study_set
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study materials: {str(e)}")

