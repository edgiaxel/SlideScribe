import pytest
from app.models import SourceMaterial, SlidePage, TranscriptSegment, Citation
from app.generator import build_grounded_prompt, generate_structured_note

@pytest.mark.anyio
async def test_build_grounded_prompt_citations():
    sources = [
        SourceMaterial(
            id="src-1",
            filename="CS101_Lecture1.pdf",
            file_type="pdf",
            file_size_bytes=1024,
            slide_pages=[
                SlidePage(page_number=1, text="Introduction to Algorithms and Big O notation", char_count=45),
                SlidePage(page_number=2, text="Time complexity measures runtime growth relative to input size N", char_count=65),
            ],
            total_slides=2
        ),
        SourceMaterial(
            id="src-2",
            filename="lecture_audio.mp3",
            file_type="audio",
            file_size_bytes=2048,
            transcript_segments=[
                TranscriptSegment(id=1, start_time=12.0, end_time=25.0, timestamp_label="00:12 - 00:25", text="Make sure you understand worst case vs average case for the midterm."),
            ],
            duration_seconds=25.0
        )
    ]

    prompt, citations = build_grounded_prompt(sources)

    # Verify prompt contains grounding instructions and content
    assert "SlideScribe" in prompt
    assert "[Slide 1 (CS101_Lecture1.pdf)]: Introduction to Algorithms" in prompt
    assert "[Slide 2 (CS101_Lecture1.pdf)]: Time complexity" in prompt
    assert "[Audio 00:12 - 00:25 (lecture_audio.mp3)]: Make sure you understand" in prompt

    # Verify citations structure
    assert len(citations) == 3
    assert citations[0].reference_label == "Slide 1"
    assert citations[0].type == "slide"
    assert citations[0].source_title == "CS101_Lecture1.pdf"
    assert "Introduction to Algorithms" in (citations[0].details or "")

    assert citations[1].reference_label == "Slide 2"
    assert citations[1].type == "slide"

    assert citations[2].reference_label == "00:12 - 00:25"
    assert citations[2].type == "audio"
    assert citations[2].source_title == "lecture_audio.mp3"

@pytest.mark.anyio
async def test_generate_structured_note_live_gemma():
    """
    Executes real inference on local Ollama gemma3:4b to verify end-to-end generation.
    """
    sources = [
        SourceMaterial(
            id="src-1",
            filename="Linear_Regression.pdf",
            file_type="pdf",
            file_size_bytes=500,
            slide_pages=[
                SlidePage(
                    page_number=1,
                    text="Ordinary Least Squares (OLS) minimizes the sum of squared differences between observed and predicted values.",
                    char_count=110
                )
            ],
            total_slides=1
        )
    ]

    html_result, citations = await generate_structured_note(sources, title_hint="OLS Regression")

    # Assert valid output was returned by Gemma
    assert html_result is not None
    assert len(html_result) > 20
    assert ("<h2" in html_result or "<p>" in html_result or "OLS" in html_result or "Regression" in html_result or "Least Squares" in html_result)
    assert len(citations) == 1
    assert citations[0].reference_label == "Slide 1"
    assert citations[0].source_title == "Linear_Regression.pdf"

@pytest.mark.anyio
async def test_generate_structured_note_empty_materials():
    """
    Ensures safe handling when no extractable text is provided without raising unexpected crashes.
    """
    sources = []
    html_result, citations = await generate_structured_note(sources, title_hint="Empty Material")
    assert "No extractable text" in html_result
    assert citations == []
