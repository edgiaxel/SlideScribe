import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_process_materials_invalid_extension():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = [
            ("files", ("bad_file.exe", b"binary content", "application/octet-stream"))
        ]
        response = await client.post("/api/process-materials", files=files)
        assert response.status_code == 400
        assert "Unsupported file format '.exe'" in response.json()["detail"]

@pytest.mark.anyio
async def test_process_materials_empty_file():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = [
            ("files", ("empty.pdf", b"", "application/pdf"))
        ]
        response = await client.post("/api/process-materials", files=files)
        assert response.status_code == 400
        assert "is empty" in response.json()["detail"]

@pytest.mark.anyio
async def test_process_materials_pdf_and_audio():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with open("tests/test_slides.pdf", "rb") as f_pdf, open("tests/test_audio.wav", "rb") as f_audio:
            files = [
                ("files", ("test_slides.pdf", f_pdf.read(), "application/pdf")),
                ("files", ("test_audio.wav", f_audio.read(), "audio/wav")),
            ]
            response = await client.post(
                "/api/process-materials",
                files=files,
                data={"workspace": "Data Science"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "completed"
            assert data["note_id"] is not None
            assert len(data["sources"]) == 2
            
            # Check PDF source
            pdf_src = next(s for s in data["sources"] if s["file_type"] == "pdf")
            assert pdf_src["total_slides"] == 1
            assert len(pdf_src["slide_pages"]) == 1
            assert pdf_src["slide_pages"][0]["page_number"] == 1

            # Check Audio source
            audio_src = next(s for s in data["sources"] if s["file_type"] == "audio")
            assert audio_src["duration_seconds"] == 1.0

            # Verify associated note was created
            note_res = await client.get(f"/api/notes/{data['note_id']}")
            assert note_res.status_code == 200
            created_note = note_res.json()
            assert created_note["workspace"] == "Data Science"
            assert "test slides" in created_note["title"].lower()
            assert len(created_note["content"]) > 0
            assert len(created_note["citations"]) >= 1
            assert any(c["type"] == "slide" for c in created_note["citations"])

            # Verify job can be queried by ID
            job_res = await client.get(f"/api/jobs/{data['job_id']}")
            assert job_res.status_code == 200
            assert job_res.json()["job_id"] == data["job_id"]
