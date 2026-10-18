import json
import logging
from typing import List, Tuple, Optional
import httpx
from app.models import (
    SourceMaterial,
    Citation,
    QuizOption,
    QuizQuestion,
    FlashcardItem,
    StudySetResponse
)
from app.config import (
    OLLAMA_BASE_URL,
    GEMMA_MODEL,
    LLM_TIMEOUT_SECONDS,
    MAX_INPUT_CHARS_PER_PROMPT
)

logger = logging.getLogger(__name__)

def build_grounded_prompt(sources: List[SourceMaterial]) -> Tuple[str, List[Citation]]:
    """
    Constructs a grounded prompt from extracted sources (slides and transcript segments),
    extracting precise slide indices and audio timestamps as verifiable citations.
    Implements character budget chunking to prevent context overflow.
    """
    context_chunks: List[str] = []
    verifiable_citations: List[Citation] = []
    current_chars = 0

    for s in sources:
        if s.file_type == "pdf" and s.slide_pages:
            for page in s.slide_pages:
                text_clean = page.text.strip()
                if not text_clean:
                    continue
                chunk = f"[Slide {page.page_number} ({s.filename})]: {text_clean}"
                if current_chars + len(chunk) > MAX_INPUT_CHARS_PER_PROMPT:
                    break
                context_chunks.append(chunk)
                current_chars += len(chunk)

                # Keep citation reference
                verifiable_citations.append(Citation(
                    id=f"cite-slide-{page.page_number}",
                    type="slide",
                    source_title=s.filename,
                    reference_label=f"Slide {page.page_number}",
                    details=text_clean[:120]
                ))

        elif s.file_type == "audio" and s.transcript_segments:
            for seg in s.transcript_segments:
                text_clean = seg.text.strip()
                if not text_clean:
                    continue
                chunk = f"[Audio {seg.timestamp_label} ({s.filename})]: {text_clean}"
                if current_chars + len(chunk) > MAX_INPUT_CHARS_PER_PROMPT:
                    break
                context_chunks.append(chunk)
                current_chars += len(chunk)

                # Keep citation reference
                verifiable_citations.append(Citation(
                    id=f"cite-audio-{seg.id}",
                    type="audio",
                    source_title=s.filename,
                    reference_label=seg.timestamp_label,
                    details=text_clean[:120]
                ))

    context_text = "\n\n".join(context_chunks)

    prompt = f"""You are SlideScribe, an AI lecture note-taking assistant. Your role is to generate structured, accurate, and source-grounded study notes based solely on the provided lecture materials.

CRITICAL GROUNDING RULES:
1. Every major explanation or statement must be directly supported by the extracted slides or transcript below.
2. When referencing information from a specific slide, write [Slide X]. When referencing spoken lecture audio, write [Audio MM:SS].
3. Format output cleanly in HTML compatible with rich text editors (use <h2>, <h3>, <p>, <ul>, <li>, <blockquote>).
4. Do NOT hallucinate or extrapolate facts not present in the sources.
5. Structure the notes into:
   - Lecture Overview & Core Theme
   - Key Concept Breakdowns with Source Tags
   - Critical Principles or Takeaways

LECTURE SOURCES:
{context_text}

GENERATE STRUCTURED HTML NOTES:"""

    return prompt, verifiable_citations

async def generate_structured_note(
    sources: List[SourceMaterial],
    title_hint: Optional[str] = None
) -> Tuple[str, List[Citation]]:
    """
    Executes grounded note generation via the local Gemma 3 4B model hosted on Ollama.
    Returns (html_content, verified_citations).
    """
    prompt, citations = build_grounded_prompt(sources)
    
    if not prompt or not citations:
        # Fallback if no text was extractable
        fallback_html = (
            f"<h2>{title_hint or 'Lecture Notes'}</h2>"
            "<p>No extractable text or audio transcripts were found in the uploaded materials.</p>"
        )
        return fallback_html, []

    payload = {
        "model": GEMMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2, # Low temperature for strict factual grounding
            "top_p": 0.9,
            "num_predict": 1024
        }
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
            res = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if res.status_code != 200:
                raise RuntimeError(
                    f"Ollama server returned error {res.status_code}: {res.text}"
                )
            data = res.json()
            raw_response = data.get("response", "").strip()

            if not raw_response:
                raise RuntimeError("Gemma model returned an empty response.")

            # Clean any Markdown code fence if model wrapped its HTML in ```html ... ```
            cleaned_html = raw_response
            if cleaned_html.startswith("```html"):
                cleaned_html = cleaned_html[7:]
            elif cleaned_html.startswith("```"):
                cleaned_html = cleaned_html[3:]
            if cleaned_html.endswith("```"):
                cleaned_html = cleaned_html[:-3]
            cleaned_html = cleaned_html.strip()

            return cleaned_html, citations

    except httpx.ConnectError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Ensure 'ollama serve' is active."
        )
    except httpx.TimeoutException:
        raise RuntimeError(
            f"Gemma inference timed out after {LLM_TIMEOUT_SECONDS} seconds."
        )
    except Exception as e:
        logger.error(f"Gemma generation failed: {e}")
        raise RuntimeError(f"Gemma note generation failure: {str(e)}")

async def generate_study_set(
    note_id: str,
    note_title: str,
    note_content: str,
    citations: Optional[List[Citation]] = None,
    depth: str = "simple",
    custom_prompt: Optional[str] = None
) -> StudySetResponse:
    """
    Generates grounded quiz questions and flashcards using Gemma 3 4B based strictly on note content.
    Supports simple (3-4 questions) vs in-depth (5-6 questions) and custom user focus prompts.
    """
    clean_content = note_content.strip()
    if not clean_content:
        raise RuntimeError("Cannot generate study materials from an empty note.")

    # Format available citations to help the model tag questions and flashcards
    citations_info = ""
    if citations:
        labels = [f"{c.reference_label} ({c.source_title})" for c in citations]
        citations_info = f"Grounding Citations Available: {', '.join(labels)}\n"

    budgeted_content = clean_content[:MAX_INPUT_CHARS_PER_PROMPT]

    if depth == "in_depth":
        question_req = "Generate between 5 and 6 multiple-choice quiz questions covering diverse concepts in the note."
        card_req = "Generate between 5 and 8 flashcards with key concepts, definitions, and formulas."
        num_predict = 1536
    else:
        question_req = "Generate between 3 and 4 multiple-choice quiz questions based strictly on the note."
        card_req = "Generate between 3 and 5 flashcards with key concepts/terms and their definitions."
        num_predict = 1024

    custom_focus_section = ""
    if custom_prompt and custom_prompt.strip():
        custom_focus_section = f"""
USER CUSTOM FOCUS / TOPIC INSTRUCTIONS:
"{custom_prompt.strip()}"
Please prioritize generating quiz questions and flashcards specifically tailored around this requested topic or perspective, while remaining strictly grounded in the note content.
"""

    prompt = f"""You are SlideScribe, an AI study companion. Generate study materials grounded strictly in the provided lecture note.

Note Title: {note_title}
{citations_info}
Note Content:
{budgeted_content}
{custom_focus_section}
REQUIREMENTS:
1. {question_req}
2. Each question must have exactly 4 options (A, B, C, D) with exactly one correct option marked (correct: true).
3. Provide a clear grounding explanation referencing the note or citation tag (like [Slide X] or [Audio MM:SS]).
4. {card_req}
5. In source_ref, reference the specific citation tag (e.g. "[Slide 14]") if mentioned, otherwise use "Note Content".
6. Respond ONLY with a valid JSON object matching the exact schema below without any extra markdown explanation.

JSON SCHEMA:
{{
  "quiz_questions": [
    {{
      "id": 1,
      "topic": "Topic Name",
      "question": "Question text?",
      "options": [
        {{"id": "A", "text": "Option A", "correct": false}},
        {{"id": "B", "text": "Option B", "correct": true}},
        {{"id": "C", "text": "Option C", "correct": false}},
        {{"id": "D", "text": "Option D", "correct": false}}
      ],
      "explanation": "Grounding explanation",
      "source_ref": "[Slide X] or Note Content"
    }}
  ],
  "flashcards": [
    {{
      "id": 1,
      "term": "Term",
      "definition": "Definition text",
      "source_ref": "[Slide X] or Note Content"
    }}
  ]
}}"""

    payload = {
        "model": GEMMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
            "num_predict": num_predict
        }
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_SECONDS) as client:
            res = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if res.status_code != 200:
                raise RuntimeError(
                    f"Ollama server returned error {res.status_code}: {res.text}"
                )
            data = res.json()
            raw_response = data.get("response", "").strip()

            if not raw_response:
                raise RuntimeError("Gemma model returned an empty response.")

            # Clean any Markdown code fence
            cleaned_json = raw_response
            if cleaned_json.startswith("```json"):
                cleaned_json = cleaned_json[7:]
            elif cleaned_json.startswith("```"):
                cleaned_json = cleaned_json[3:]
            if cleaned_json.endswith("```"):
                cleaned_json = cleaned_json[:-3]
            cleaned_json = cleaned_json.strip()

            try:
                parsed = json.loads(cleaned_json)
            except Exception as pe:
                logger.error(f"Failed to parse study JSON: {pe}. Raw output: {raw_response[:200]}")
                raise RuntimeError(f"Model output could not be parsed as valid study data JSON: {str(pe)}")

            quiz_raw = parsed.get("quiz_questions", [])
            flash_raw = parsed.get("flashcards", [])

            quiz_questions: List[QuizQuestion] = []
            for idx, q in enumerate(quiz_raw, start=1):
                options = [QuizOption(**opt) for opt in q.get("options", [])]
                quiz_questions.append(QuizQuestion(
                    id=idx,
                    topic=q.get("topic", "General"),
                    question=q.get("question", ""),
                    options=options,
                    explanation=q.get("explanation", ""),
                    source_ref=q.get("source_ref", "Note Content")
                ))

            flashcards: List[FlashcardItem] = []
            for idx, f in enumerate(flash_raw, start=1):
                flashcards.append(FlashcardItem(
                    id=idx,
                    term=f.get("term", ""),
                    definition=f.get("definition", ""),
                    source_ref=f.get("source_ref", "Note Content")
                ))

            if not quiz_questions and not flashcards:
                raise RuntimeError("Gemma model did not generate any quiz questions or flashcards.")

            return StudySetResponse(
                note_id=note_id,
                note_title=note_title,
                quiz_questions=quiz_questions,
                flashcards=flashcards
            )

    except httpx.ConnectError:
        raise RuntimeError(
            f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Ensure 'ollama serve' is active."
        )
    except httpx.TimeoutException:
        raise RuntimeError(
            f"Gemma study generation timed out after {LLM_TIMEOUT_SECONDS} seconds."
        )
    except Exception as e:
        logger.error(f"Study generation failed: {e}")
        raise RuntimeError(f"Gemma study generation failure: {str(e)}")
