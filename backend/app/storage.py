import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict
from app.config import MONGODB_URI, MONGODB_DB_NAME
from app.models import NoteCreate, NoteUpdate, NoteResponse, Citation

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None

class StorageManager:
    def __init__(self):
        self.use_mongo = False
        self._memory_notes: Dict[str, dict] = {}
        self._memory_jobs: Dict[str, dict] = {}
        self._memory_study_sets: Dict[str, dict] = {}

        now = datetime.now(timezone.utc)
        self._memory_notes["note-forecasting"] = {
            "id": "note-forecasting",
            "title": "Understanding Forecasting",
            "workspace": "Business Analytics",
            "content": """<h2>Understanding Forecasting in Modern Operations</h2>
<p>Forecasting uses historical observations to estimate future outcomes across business horizons. Organizations rely heavily on dynamic models to balance seasonal trends, short-term demand variations, and macroeconomic shifts to avoid inventory overruns.</p>
<blockquote><p>“A forecast is an operational estimate, never an absolute guarantee.” — Prof. Aris Thorne</p></blockquote>
<h3>1. Quantitative vs. Qualitative Forecasting</h3>
<p>While quantitative techniques leverage structured historical metrics, qualitative frameworks translate professional intuition and consumer sentiment into directional benchmarks. During initial product releases where longitudinal data is absent, consensus panels provide baseline projections.</p>
<ul>
<li><strong>Quantitative:</strong> Time series smoothing (SMA, EMA), ARIMA autoregressive techniques.</li>
<li><strong>Qualitative:</strong> Delphi method panel consensus, executive opinion matrices.</li>
</ul>""",
            "citations": [
                {
                    "id": "c1",
                    "type": "slide",
                    "source_title": "Lecture_03_Forecasting.pdf",
                    "reference_label": "Slide 14 · PPTX",
                    "details": "Time-series curve with upper and lower 95% forecast boundaries."
                },
                {
                    "id": "c2",
                    "type": "audio",
                    "source_title": "Lecture Audio Recording",
                    "reference_label": "18:40",
                    "details": "“Remember this for the midterm: always state your assumptions before selecting ARIMA or moving averages.”"
                }
            ],
            "created_at": now,
            "updated_at": now
        }
        
        self._client = None
        self._client_loop = None

        if MONGODB_URI and AsyncIOMotorClient is not None:
            self.use_mongo = True

    @property
    def db(self):
        if not self.use_mongo:
            return None
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if self._client is None or self._client_loop != loop:
            try:
                self._client = AsyncIOMotorClient(MONGODB_URI)
                self._client_loop = loop
            except Exception as e:
                print(f"[StorageManager] Failed to initialize Mongo: {e}. Falling back to memory storage.")
                self.use_mongo = False
                return None
        return self._client[MONGODB_DB_NAME]

    def is_mongo_configured(self) -> bool:
        return self.use_mongo

    def _doc_to_response(self, doc: dict) -> NoteResponse:
        citations = [Citation(**c) for c in doc.get("citations", [])]
        content = doc.get("content", "")
        # calculate word count
        words = len(content.split()) if content else 0
        return NoteResponse(
            id=doc["id"],
            title=doc.get("title", "Untitled Note"),
            content=content,
            workspace=doc.get("workspace", "General"),
            citations=citations,
            word_count=words,
            created_at=doc["created_at"],
            updated_at=doc["updated_at"]
        )

    async def list_notes(self) -> List[NoteResponse]:
        if self.use_mongo and self.db is not None:
            cursor = self.db.notes.find().sort("updated_at", -1)
            notes = []
            async for doc in cursor:
                notes.append(self._doc_to_response(doc))
            return notes
        else:
            sorted_docs = sorted(
                self._memory_notes.values(),
                key=lambda x: x["updated_at"],
                reverse=True
            )
            return [self._doc_to_response(d) for d in sorted_docs]

    async def get_note(self, note_id: str) -> Optional[NoteResponse]:
        if self.use_mongo and self.db is not None:
            doc = await self.db.notes.find_one({"id": note_id})
            if doc:
                return self._doc_to_response(doc)
            return None
        else:
            doc = self._memory_notes.get(note_id)
            if doc:
                return self._doc_to_response(doc)
            return None

    async def create_note(self, note_data: NoteCreate) -> NoteResponse:
        now = datetime.now(timezone.utc)
        note_id = f"note-{uuid.uuid4().hex[:8]}"
        doc = {
            "id": note_id,
            "title": note_data.title,
            "content": note_data.content,
            "workspace": note_data.workspace or "General",
            "citations": [c.model_dump() for c in note_data.citations],
            "created_at": now,
            "updated_at": now
        }
        if self.use_mongo and self.db is not None:
            await self.db.notes.insert_one(doc)
        else:
            self._memory_notes[note_id] = doc
        return self._doc_to_response(doc)

    async def update_note(self, note_id: str, note_data: NoteUpdate) -> Optional[NoteResponse]:
        now = datetime.now(timezone.utc)
        update_fields: dict = {"updated_at": now}
        
        if note_data.title is not None:
            update_fields["title"] = note_data.title
        if note_data.content is not None:
            update_fields["content"] = note_data.content
        if note_data.workspace is not None:
            update_fields["workspace"] = note_data.workspace
        if note_data.citations is not None:
            update_fields["citations"] = [c.model_dump() for c in note_data.citations]

        if self.use_mongo and self.db is not None:
            result = await self.db.notes.find_one_and_update(
                {"id": note_id},
                {"$set": update_fields},
                return_document=True
            )
            if result:
                return self._doc_to_response(result)
            return None
        else:
            doc = self._memory_notes.get(note_id)
            if not doc:
                return None
            doc.update(update_fields)
            self._memory_notes[note_id] = doc
            return self._doc_to_response(doc)

    async def delete_note(self, note_id: str) -> bool:
        if self.use_mongo and self.db is not None:
            res = await self.db.notes.delete_one({"id": note_id})
            return res.deleted_count > 0
        else:
            if note_id in self._memory_notes:
                del self._memory_notes[note_id]
                return True
            return False

    # --- Processing Jobs ---

    async def create_job(self, note_id: Optional[str] = None, workspace: str = "General") -> dict:
        now = datetime.now(timezone.utc)
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        job_doc = {
            "job_id": job_id,
            "note_id": note_id,
            "workspace": workspace,
            "status": "pending",
            "current_stage": "initialized",
            "stages_completed": [],
            "error_message": None,
            "sources": [],
            "created_at": now,
            "updated_at": now
        }
        if self.use_mongo and self.db is not None:
            await self.db.jobs.insert_one(job_doc)
        else:
            self._memory_jobs[job_id] = job_doc
        return job_doc

    async def get_job(self, job_id: str) -> Optional[dict]:
        if self.use_mongo and self.db is not None:
            return await self.db.jobs.find_one({"job_id": job_id})
        return self._memory_jobs.get(job_id)

    async def update_job(self, job_id: str, updates: dict) -> Optional[dict]:
        updates["updated_at"] = datetime.now(timezone.utc)
        if self.use_mongo and self.db is not None:
            return await self.db.jobs.find_one_and_update(
                {"job_id": job_id},
                {"$set": updates},
                return_document=True
            )
        job = self._memory_jobs.get(job_id)
        if job:
            job.update(updates)
            self._memory_jobs[job_id] = job
            return job
        return None

    # --- Study Sets ---

    async def get_study_set(self, note_id: str) -> Optional[dict]:
        if self.use_mongo and self.db is not None:
            return await self.db.study_sets.find_one({"note_id": note_id})
        return self._memory_study_sets.get(note_id)

    async def save_study_set(self, note_id: str, study_set_data: dict) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "note_id": note_id,
            **study_set_data,
            "updated_at": now
        }
        if self.use_mongo and self.db is not None:
            await self.db.study_sets.update_one(
                {"note_id": note_id},
                {"$set": doc},
                upsert=True
            )
        else:
            self._memory_study_sets[note_id] = doc
        return doc

    # --- Workspace Operations ---

    async def rename_workspace(self, old_name: str, new_name: str) -> int:
        now = datetime.now(timezone.utc)
        if self.use_mongo and self.db is not None:
            res = await self.db.notes.update_many(
                {"workspace": old_name},
                {"$set": {"workspace": new_name, "updated_at": now}}
            )
            return res.modified_count
        else:
            count = 0
            for note in self._memory_notes.values():
                if note.get("workspace") == old_name:
                    note["workspace"] = new_name
                    note["updated_at"] = now
                    count += 1
            return count

    async def delete_workspace(self, workspace_name: str) -> int:
        if self.use_mongo and self.db is not None:
            res = await self.db.notes.delete_many({"workspace": workspace_name})
            return res.deleted_count
        else:
            to_delete = [
                note_id for note_id, note in self._memory_notes.items()
                if note.get("workspace") == workspace_name
            ]
            for note_id in to_delete:
                del self._memory_notes[note_id]
            return len(to_delete)

storage = StorageManager()

