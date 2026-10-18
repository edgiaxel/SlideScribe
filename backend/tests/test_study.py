import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_get_study_materials_nonexistent_note():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/notes/nonexistent-id/study")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

@pytest.mark.anyio
async def test_study_materials_generation_and_caching():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a note with verifiable content and citations
        create_payload = {
            "title": "Machine Learning Validation",
            "content": "<h2>Model Evaluation</h2><p>Cross-validation partitions datasets into training and testing folds to prevent overfitting. [Slide 3]</p><p>Hyperparameter tuning with grid search systematically explores candidate configurations. [Slide 4]</p>",
            "workspace": "Machine Learning",
            "citations": [
                {
                    "id": "c-slide-3",
                    "type": "slide",
                    "source_title": "ML_Validation.pdf",
                    "reference_label": "Slide 3",
                    "details": "Cross-validation partitioning diagram"
                },
                {
                    "id": "c-slide-4",
                    "type": "slide",
                    "source_title": "ML_Validation.pdf",
                    "reference_label": "Slide 4",
                    "details": "Grid search parameter matrices"
                }
            ]
        }
        note_res = await client.post("/api/notes", json=create_payload)
        assert note_res.status_code == 201
        note_id = note_res.json()["id"]

        # 2. Request study set generation via GET
        study_res = await client.get(f"/api/notes/{note_id}/study")
        assert study_res.status_code == 200
        data = study_res.json()

        assert data["note_id"] == note_id
        assert data["note_title"] == "Machine Learning Validation"
        assert len(data["quiz_questions"]) >= 1
        assert len(data["flashcards"]) >= 1

        # Check quiz question structure
        first_q = data["quiz_questions"][0]
        assert "question" in first_q
        assert len(first_q["options"]) == 4
        assert any(opt["correct"] is True for opt in first_q["options"])
        assert "explanation" in first_q
        assert first_q["source_ref"] is not None

        # Check flashcard structure
        first_card = data["flashcards"][0]
        assert len(first_card["term"]) > 0
        assert len(first_card["definition"]) > 0
        assert first_card["source_ref"] is not None

        # 3. Test caching: second GET returns cached result
        cached_res = await client.get(f"/api/notes/{note_id}/study")
        assert cached_res.status_code == 200
        assert cached_res.json()["quiz_questions"][0]["question"] == first_q["question"]

        # 4. Test forced regeneration via POST
        regen_res = await client.post(f"/api/notes/{note_id}/study")
        assert regen_res.status_code == 200
        assert len(regen_res.json()["quiz_questions"]) >= 1
