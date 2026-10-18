import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

@pytest.mark.anyio
async def test_note_crud():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Note
        create_res = await client.post("/api/notes", json={
            "title": "Test Forecasting Lecture",
            "content": "<p>Initial forecasting notes content</p>",
            "workspace": "Business Analytics",
            "citations": [
                {
                    "id": "c1",
                    "type": "slide",
                    "source_title": "Lecture_03.pdf",
                    "reference_label": "Slide 14",
                    "details": "ARIMA visual"
                }
            ]
        })
        assert create_res.status_code == 201
        created = create_res.json()
        note_id = created["id"]
        assert created["title"] == "Test Forecasting Lecture"
        assert len(created["citations"]) == 1

        # 2. Get Note
        get_res = await client.get(f"/api/notes/{note_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == note_id

        # 3. Update / Rename Note
        update_res = await client.put(f"/api/notes/{note_id}", json={
            "title": "Renamed Forecasting Lecture",
            "content": "<p>Updated forecasting notes with extra insights</p>"
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["title"] == "Renamed Forecasting Lecture"
        assert "Updated forecasting notes" in updated["content"]

        # 4. List Notes
        list_res = await client.get("/api/notes")
        assert list_res.status_code == 200
        notes = list_res.json()
        assert any(n["id"] == note_id for n in notes)

        # 5. Delete Note
        del_res = await client.delete(f"/api/notes/{note_id}")
        assert del_res.status_code == 200

        # Verify not found after deletion
        get_after_del = await client.get(f"/api/notes/{note_id}")
        assert get_after_del.status_code == 404

@pytest.mark.anyio
async def test_workspace_operations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create notes in a custom workspace
        ws_name = "Operations Research"
        res1 = await client.post("/api/notes", json={
            "title": "OR Note 1",
            "content": "<p>Linear programming</p>",
            "workspace": ws_name
        })
        assert res1.status_code == 201
        res2 = await client.post("/api/notes", json={
            "title": "OR Note 2",
            "content": "<p>Simplex method</p>",
            "workspace": ws_name
        })
        assert res2.status_code == 201

        # Rename workspace
        new_ws_name = "Optimization Methods"
        rename_res = await client.put(f"/api/workspaces/{ws_name}", json={"new_name": new_ws_name})
        assert rename_res.status_code == 200
        assert rename_res.json()["modified_count"] == 2

        # Check notes have new workspace
        notes_res = await client.get("/api/notes")
        notes = notes_res.json()
        or_notes = [n for n in notes if n["workspace"] == new_ws_name]
        assert len(or_notes) >= 2

        # Delete workspace
        del_res = await client.delete(f"/api/workspaces/{new_ws_name}")
        assert del_res.status_code == 200
        assert del_res.json()["deleted_count"] >= 2

        # Confirm all notes in that workspace were deleted
        notes_res_after = await client.get("/api/notes")
        remaining_notes = [n for n in notes_res_after.json() if n["workspace"] == new_ws_name]
        assert len(remaining_notes) == 0

