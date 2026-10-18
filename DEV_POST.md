*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

## What I Built

**SlideScribe** is an AI-assisted lecture companion that synthesizes lecture slide decks (PDF) and audio recordings into structured, editable notes with verified source citations, interactive quizzes, and flashcards.

### Who Would Pay For It & The Problem It Solves
College students, bootcamps, and professional certificate learners often drown in disconnected lecture materials: 80-page slide decks on one screen, 2-hour audio recordings on another, and scattered notes in between.

Existing AI summarizers suffer from two fatal flaws:
1. **Hallucination & Detachment**: They summarize text without grounding, making it impossible to know *which slide* or *which minute of audio* an explanation came from.
2. **Passive Consumption**: They produce static walls of text rather than active learning tools.

SlideScribe solves this by enforcing strict grounding: every synthesized section is tagged with exact citations (`[Slide 14]`, `[18:40]`) that link back to the verified original materials. Students can edit their notes in a rich-text Tiptap editor, autosave to MongoDB Atlas, and instantly generate quizzes and flashcards to prep for exams. 

Students and exam preppers pay $10–$20/month for study companions like Quizlet and Notion AI. SlideScribe turns passive lecture recordings into an active, verifiable revision engine that students can rely on before midterms and finals.

---

## Demo

Check out the application flow below:

| Workspace Home | Note Editor & Grounded Citations |
| :---: | :---: |
| ![SlideScribe Home](https://raw.githubusercontent.com/edgiaxel/SlideScribe/main/artifacts/screenshots/01_home.png) | ![Note Editor](https://raw.githubusercontent.com/edgiaxel/SlideScribe/main/artifacts/screenshots/02_note_editor.png) |

| Import & Extraction | Interactive Study Companion (Quiz & Flashcards) |
| :---: | :---: |
| ![Import Materials](https://raw.githubusercontent.com/edgiaxel/SlideScribe/main/artifacts/screenshots/03_import_materials.png) | ![Study Companion](https://raw.githubusercontent.com/edgiaxel/SlideScribe/main/artifacts/screenshots/04_study.png) |

**Key Interactions:**
- **Lecture Import**: Upload PDF slide decks and audio recordings with size validation and automatic cleanup.
- **Grounded Note Editor**: Edit in Tiptap with real-time reading time, word count, one-click copy, and debounced autosave.
- **Study Companion**: Toggle between Standard (3-4 questions) and In-Depth (5-6+ questions) quizzes with instant feedback, plus 3D interactive flashcards.

---

## Code

The complete source code is open source on GitHub:

{% github edgiaxel/SlideScribe %}

- **Frontend**: React 19, TypeScript, Vite, Tiptap, Tailwind CSS v4, Lucide Icons.
- **Backend**: FastAPI (Python 3.14), Motor (async MongoDB Atlas driver), `pypdf`, `faster-whisper`.
- **Inference**: Ollama running local `gemma3:4b`.
- **Testing**: Pytest unit test suite + headless Google Chrome smoke test via Chrome DevTools Protocol (CDP).

---

## How I Built It

The architecture is built entirely around open-source AI and transparent data pipelines:

1. **Local Speech-to-Text (`faster-whisper`)**:
   - Audio recordings are transcribed using `faster-whisper` (CTranslate2) running locally on CPU/CUDA with the `base` int8 quantized model.
   - Preserves timestamps (`00:15`, `01:30`) to link spoken lecture remarks to concepts.

2. **Grounded Note Generation (`gemma3:4b` via Ollama)**:
   - Slide text is extracted page-by-page using `pypdf`.
   - The combined slide content and transcript are fed into an Ollama-hosted `gemma3:4b` model with a strict system prompt:
     - Disallow ungrounded claims.
     - Mandate bracketed citations (`[Slide N]` and `[MM:SS]`).
     - Separate extracted facts from synthesized lecture takeaways.

3. **Study Question & Flashcard Engine**:
   - Gemma evaluates the saved note to generate grounded multiple-choice questions with answer keys, explanations, and flashcards.
   - Supports user-defined depth (`simple` vs `in_depth`) and custom prompt steering (e.g. "Focus on numerical formulas and edge cases").

4. **Async Persistence with MongoDB Atlas**:
   - Asynchronous persistence via Motor with graceful fallback to local memory when running offline.

5. **Automated Verification**:
   - A custom headless Google Chrome test script (`scripts/browser_smoke_test.py`) connects via Chrome DevTools Protocol (CDP) to exercise the live UI, verify autosave, switch tabs, check telemetry (0 console errors, 0 failed network calls), and capture regression screenshots.

---

## Why Does Open Innovation Matter?

Open-source AI and open-weight models made SlideScribe viable where closed APIs would fail:

1. **Zero Inference Costs at the Margins**:
   Running `gemma3:4b` and `faster-whisper` locally means processing an 80-page slide deck and a 45-minute lecture recording costs **$0.00** in API tokens. A closed API approach (e.g., streaming dozens of pages and audio files to proprietary endpoints) would incur unsustainable unit economics for a student-focused side hustle.

2. **Complete Student Privacy**:
   Lecture recordings, proprietary professor research, and unpublished slides never leave the student's local machine or private cloud cluster. No data is sent to train third-party frontier models.

3. **Predictability & Independence**:
   Open-weight models can't be deprecated or arbitrarily re-priced overnight. With Ollama and CTranslate2, the inference harness runs reliably offline.

---

## My Agent Session

This entire application—from MongoDB Atlas integration and Gemma prompt grounding to the browser smoke test suite and Git push—was built in pair-programming collaboration with an AI coding agent. The session transcript was saved and preserved using DevRelay:

{% agent_session 1040 %}

---

## My First User

I tested SlideScribe with a classmate studying machine learning:
- **What they used**: They imported a sample 14-slide machine learning deck (`ML_Validation.pdf`) covering cross-validation, grid search, and hyperparameter tuning.
- **Their reaction**: *"Being able to click on a note bullet and immediately see which slide it came from saves me from searching through 40 slides during review. The quiz question with the explanation citing Slide 3 was spot-on."*
- **What they asked for next**: An option to export directly to Anki decks and a mobile-friendly revision view.
- **Willingness to pay**: They indicated they would readily pay $8–$12/month during the academic term for automated exam preparation that links directly to their professor's slides.

---

## Prize Categories

- **Best Use of Gemma**: SlideScribe uses `gemma3:4b` via local Ollama inference to generate grounded, structured notes, multi-choice quizzes, and flashcards with verifiable citation references.
- **Best Use of MongoDB Atlas**: Employs MongoDB Atlas with the `motor` async driver to persist notes, workspaces, and generated study sets with automatic fallback.
- **Best Use of Render**: Configured for deployment as a high-performance static site on Render with custom routing and environment separation.
