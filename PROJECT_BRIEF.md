# SlideScribe Project Brief

## 1. Project Overview

**SlideScribe** is an AI-assisted lecture note-taking and study application that transforms lecture slides and audio recordings into structured, editable notes with source references.

Its main differentiator is the combination of visual lecture material and spoken explanations. Instead of summarizing a PDF or transcribing audio independently, SlideScribe aims to connect lecture explanations to the relevant slides and transcript timestamps.

The result should help students create useful study notes while retaining the ability to inspect the original material, edit the generated content, and create study exercises.

### Product Goal

Build a functional, publicly demonstrable hackathon MVP that supports the core workflow from importing lecture materials to generating, editing, saving, and studying notes.

Prioritize working functionality, source traceability, usability, and a reliable demonstration over feature quantity.

### Target Users

Students and learners who work with lecture slides, recorded lectures, and other educational materials.

### Core Value Proposition

**Turn lecture materials into editable, source-grounded study notes without losing the connection to what was actually taught.**

## 2. Core User Workflow

The intended workflow is:

1. Import lecture slides and, optionally, a lecture audio recording.
2. Extract slide content and transcribe the recording.
3. Align relevant transcript segments with available slide information.
4. Generate structured notes using the extracted materials.
5. Review, edit, and save the generated notes.
6. Open source references to inspect the relevant slide or transcript segment.
7. Generate quizzes and flashcards from saved notes.

The application must distinguish actual implemented functionality from planned functionality. Unsupported processing steps must not be simulated as successful.

## 3. Primary Experiences

The application has four primary experiences. Supporting routes such as Settings and a full notes library are permitted when they improve navigation or usability.

### 3.1 Home

Purpose: provide a clear starting point for the user's work.

Core elements:

- Create a new note.
- Import lecture materials.
- Start an audio-focused import workflow.
- Access recent notes.
- Navigate workspaces or subjects.
- Open existing notes.

Design requirements:

- Maintain a clear visual hierarchy.
- Use realistic data from the application once persistence is implemented.
- Avoid fabricated activity, usage statistics, or processing results.
- Do not create redundant actions that lead to the same workflow without a meaningful difference.



### 3.2 Note Editor

Purpose: provide a comfortable environment for reviewing and editing notes.

Core elements:

- Editable rich-text content using Tiptap.
- Note title and basic metadata.
- Autosave with clear saving, saved, and error states.
- AI-assisted actions where implemented.
- A collapsible source-reference panel.
- Navigation back to the user's notes.

Source references should point to real slide pages or transcript timestamps whenever the source metadata supports them.

Requirements:

- Preserve user edits.
- Do not silently overwrite existing content during regeneration.
- Distinguish generated content from source excerpts when relevant.
- AI assistance must not be required for ordinary editing.
- Never display fabricated citations.



### 3.3 Import Materials

Purpose: provide one unified workflow for importing and processing lecture materials.

Initial supported input types:

- PDF lecture slides.
- PPTX presentations.
- Audio recordings.

Plain-text imports may be added if they are inexpensive to implement.

Core elements:

- File selection and upload.
- A list of selected files.
- Optional note title or destination selection.
- Real processing status.
- Clear error messages and retry behavior.
- A path to open the generated note after successful processing.

Preferred processing stages:

1. Extracting slide content.
2. Transcribing audio, when audio is provided.
3. Aligning transcript segments with slide content, when both sources are available.
4. Generating the note.
5. Completing the job or reporting a failure.

Only show stages that apply to the selected inputs.

Progress indicators must reflect actual application state. Do not invent completion percentages, estimated processing times, or successful results.

The workflow should support creating a new note first. Appending material to an existing note may be added when it can be implemented safely, with explicit user confirmation.

### 3.4 Study

Purpose: help users practice and review the content of their notes.

Core modes:

- Quiz.
- Flashcards.

Core elements:

- Generate study materials from a saved note.
- Display quiz questions and answer choices where applicable.
- Reveal or check answers.
- Display flashcards and reveal their answers.
- Provide source references when available.

Study content should be grounded in the selected note. Avoid presenting unsupported facts as though they came from the lecture.

Advanced review scheduling, mastery tracking, complex analytics, and elaborate progress dashboards are outside the initial scope.

## 4. Technology Stack

The following is the intended stack. Existing repository choices must be inspected before implementation, and any necessary changes must be justified.

### Frontend

- React.
- Vite.
- TypeScript.
- Tiptap for rich-text editing.
- Tailwind CSS if compatible with the existing setup and approved implementation approach.

Responsibilities:

- Render the application interface.
- Manage navigation and UI state.
- Provide note editing and study interactions.
- Communicate with the backend.
- Display processing status and errors accurately.



### Backend

- Python.
- FastAPI.

Responsibilities:

- Expose application API endpoints.
- Manage notes and source metadata.
- Accept and validate file uploads.
- Extract document content.
- Coordinate transcription and note generation.
- Store processing status and errors.
- Provide source information for citations.



### Database

- MongoDB Atlas is the intended hosted database.

The database should persist notes and the metadata required to associate notes with their source materials.

Do not introduce a complicated data model before the core workflow requires it.

### Transcription

- Faster-Whisper is the intended speech-to-text component.

Evaluate the selected model, audio settings, execution time, and memory requirements before integrating it into the complete workflow.

### Language Model

- Gemma 3 4B is the preferred model family for note generation.

The specific model variant, quantization, inference method, and hosting arrangement remain subject to feasibility testing.

Model integration must be configurable enough to avoid unnecessary coupling between the application and a single inference environment.

### Deployment

- Render is the intended hosting platform for the initial public demonstration.
- MongoDB Atlas is the intended hosted database.
- A custom `.tech` domain may be configured if time and budget permit.

Successful deployment of the web application does not guarantee that model inference will run within the same service's resource limits. Test the actual workload on the chosen infrastructure.

### Optional Services

Sentry and other optional services may be added if they provide meaningful value without delaying the core application.

Do not add integrations simply because they are available through a partner program or appear attractive in a technology list.

## 5. Design System



### Visual Direction

SlideScribe uses a warm, editorial, spacious interface.

The design should feel focused, readable, calm, and suitable for extended study sessions.

Avoid:

- Neon or excessively saturated colors.
- Decorative AI orbs and unnecessary AI-themed effects.
- Excessive nested cards.
- Elaborate visualizations that do not improve the core workflow.
- Fake activity dashboards or artificial performance statistics.
- Unnecessary controls that make basic actions harder to discover.



### Light Theme

- Background: `#F5F0E7`
- Surface: `#FFFCF7`
- Primary text: `#35352F`
- Secondary text: `#827E73`
- Sage: `#E5E9DC`
- Dusty blue: `#DCE7EC`
- Terracotta: `#F0E0D5`
- Borders: `#EAE4D9`



### Dark Theme

- Background: `#252823`
- Surface: `#30342D`
- Primary text: `#F0EEE5`
- Secondary text: `#B4B5A8`
- Sage: `#424B3C`
- Dusty blue: `#3B4A4E`
- Terracotta: `#514038`
- Borders: `#45483F`



### Navigation

Use a consistent, collapsible sidebar with access to:

- Home.
- Search, if implemented.
- New Note.
- Workspaces or subjects.
- Recent notes.
- Settings and theme controls.

Navigation must remain understandable when the application contains little or no user data.

### Design References

Existing HTML mockups are visual references, not production-ready application code.

Recreate the intended interface using the actual application stack. Do not copy static mockup markup into production without adapting it to the application's component structure, state, routing, and data flow.

## 6. Data and Source Traceability

The data model should support the core workflow without unnecessary complexity.

Expected conceptual entities:

### Note

- Unique identifier.
- Title.
- Editable content.
- Optional workspace or subject.
- Creation timestamp.
- Update timestamp.



### Source

- Unique identifier.
- Associated note or processing job.
- Original filename.
- File type.
- Storage reference, where applicable.
- Relevant document metadata.



### Transcript Segment

- Associated audio source.
- Segment text.
- Start and end timestamps when available.
- Speaker information only if genuinely supported by the transcription system.



### Citation

- Associated note content or generated section where practical.
- Source identifier.
- Slide or page number, when available.
- Transcript timestamp range, when available.
- Enough metadata to navigate to the referenced source.



### Processing Job

- Job identifier.
- Input source references.
- Current processing stage.
- Status.
- Error details when relevant.
- Links to successfully generated outputs.

These are conceptual entities, not a requirement to create separate database collections for every item. Choose a practical representation based on actual access patterns and implementation needs.

Study artifacts may be stored alongside notes or separately, depending on the simplest reliable implementation.

### Traceability Rules

- Citations must refer to actual source material.
- Missing source metadata must not be invented.
- A generated explanation is not a verbatim quotation unless it is actually quoted from the source.
- If alignment is approximate or unavailable, communicate that limitation.
- Preserve enough source metadata to make citations useful after the page is reloaded.



## 7. File Handling and Processing

File processing must be safe and predictable.

Requirements:

- Validate file types and sizes.
- Handle malformed or unsupported files gracefully.
- Keep temporary files under control and clean them up according to a defined lifecycle.
- Avoid exposing server paths or internal errors to end users.
- Prevent a failed processing job from being reported as successful.
- Avoid loading unnecessarily large documents or audio recordings entirely into memory when a more practical approach is available.
- Keep processing stages and error handling understandable.

The initial MVP does not require live microphone recording, speaker-diarization controls, advanced waveform visualization, or elaborate transcription configuration.

## 8. Scope Priorities



### P0: Essential Foundation

- Application shell and routing.
- Four primary experiences.
- Basic note creation and editing.
- Persistent note storage.
- Unified import interface.
- Honest processing states.
- Safe environment configuration.



### P1: Core Product Workflow

- PDF content extraction.
- Audio transcription.
- Structured note generation.
- Source references where supported.
- Note persistence and editing after generation.
- A reliable end-to-end demonstration.



### P2: Useful Extensions

- PPTX support if not already included.
- Quiz generation.
- Flashcards.
- Improved error recovery.
- Responsive and visual polish.
- Public deployment.



### P3: Optional Enhancements

- Search improvements.
- Additional import formats.
- Advanced study scheduling.
- Analytics and mastery tracking.
- Sentry integration.
- Custom domain configuration.
- Additional collaboration or integration features.

These priorities are implementation guidance, not permission to ignore the hackathon deadline. Reassess them as the working application develops.

## 9. Explicitly Out of Scope for the Initial MVP

Unless explicitly approved later, do not prioritize:

- Live microphone recording.
- Advanced speaker diarization.
- Complex waveform editors.
- Elaborate AI confidence visualizations.
- Multi-user real-time collaboration.
- Advanced spaced repetition.
- Mastery analytics.
- Large integration ecosystems.
- Unnecessary nested workspace hierarchies.
- Supporting every document format.
- Building a custom model or training a language model from scratch.

A small, complete, demonstrable workflow is more valuable than a long list of unfinished features.

## 10. Milestones and Acceptance Criteria



### Milestone 0: Repository Preparation

- Inspect the repository.
- Establish project instructions and documentation.
- Confirm the existing technology choices.
- Establish a clean Git checkpoint.



### Milestone 1: Frontend Shell

- Implement the application layout and navigation.
- Build the four primary experiences.
- Apply the approved design system.
- Verify the build and basic navigation.



### Milestone 2: Notes

- Create, rename, edit, and save notes.
- Implement appropriate persistence.
- Verify that notes survive a reload.



### Milestone 3: Backend and Database

- Establish the API contract.
- Implement note CRUD endpoints.
- Connect the database.
- Verify that notes persist across backend restarts.



### Milestone 4: Import and Extraction

- Implement file upload and validation.
- Extract PDF content.
- Add audio transcription.
- Add PPTX support where feasible.
- Verify real processing states and errors.



### Milestone 5: Note Generation and Citations

- Combine available slide and transcript content.
- Generate structured notes.
- Associate source references where supported.
- Preserve user edits.
- Verify source navigation.



### Milestone 6: Study Tools

- Generate quizzes from saved notes.
- Generate flashcards from saved notes.
- Verify basic interaction and content grounding.



### Milestone 7: Deployment and Demonstration

- Configure the hosted database.
- Deploy the frontend and backend.
- Configure environment variables and cross-origin access.
- Test the complete workflow on the deployed application.
- Prepare a reproducible demonstration and submission materials.

Each milestone must be verified before treating it as complete. Adjust the remaining scope according to the actual deadline and demonstrated progress.

## 11. Minimum End-to-End Demonstration

The minimum successful demonstration should show:

1. A user imports a small lecture slide deck and a short audio recording.
2. The application extracts slide content and transcribes the recording.
3. The application generates a structured note.
4. The note includes at least one verifiable source reference when supported by the input.
5. The user opens the generated note and edits it.
6. The edited note persists after a reload.
7. The user can generate or use at least one study artifact if that feature is implemented.

If an infrastructure or model limitation prevents part of this workflow, document the limitation and provide a reproducible fallback rather than pretending the feature works.

## 12. Development Environment and Constraints

The project is being developed with AI coding agents, primarily through Cursor, with Codex available for selected tasks.

Implementation should favor:

- Small, reviewable changes.
- Explicit acceptance criteria.
- Focused testing.
- Low unnecessary token and tool usage.
- Clear separation between completed and planned functionality.
- Straightforward local development and deployment instructions.

The developer has access to a desktop with a Ryzen 3 3100 CPU, an RTX 3050 with 6 GB VRAM, and 32 GB RAM.

Model and transcription choices must be tested against actual hardware and deployment limits rather than assumed to fit.

## 13. Definition of Done

A task is complete only when:

- Its requested behavior has been implemented.
- Relevant verification has been performed.
- Existing functionality has not been unintentionally broken.
- The changed files and any limitations have been reported.
- No secrets have been added to version control.
- The result satisfies the current milestone's acceptance criteria.



## Guiding Principle

Build SlideScribe as a reliable, source-grounded study tool, not a generic AI summarizer.

Keep the product focused, the implementation incremental, and every demonstrated feature honest about what it can actually do.