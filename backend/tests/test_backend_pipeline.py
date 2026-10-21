import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import Base, get_db
from app.models.repository import RepositoryModel
from app.models.file import FileModel
from app.models.symbol import SymbolModel
from app.models.relationship import RelationshipModel
from app.models.analysis_run import AnalysisRunModel
from app.services.repository_service import RepositoryService
from app.services.github_service import GitHubService

# In-memory SQLite DB setup with StaticPool for async FastAPI tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_full_pipeline_ingestion_and_endpoints(monkeypatch):
    """Test full backend vertical slice pipeline and all API endpoints."""

    # Mock GitHubService methods to avoid live network dependencies during unit test
    async def mock_fetch_repo_metadata(self, owner, repo):
        return {
            "name": repo,
            "owner": owner,
            "html_url": f"https://github.com/{owner}/{repo}",
            "default_branch": "main",
            "size": 100,
            "stargazers_count": 5
        }

    async def mock_fetch_repo_tree(self, owner, repo, branch):
        return [
            {"path": "app/main.py", "type": "blob", "size": 300, "mode": "100644"},
            {"path": "app/services/api.py", "type": "blob", "size": 150, "mode": "100644"},
            {"path": "app/utils/file_utils.py", "type": "blob", "size": 80, "mode": "100644"}
        ]

    async def mock_fetch_file_content(self, owner, repo, path, branch):
        if path == "app/main.py":
            return "from app.services.api import get_api\n\ndef run_main():\n    pass\n"
        elif path == "app/services/api.py":
            return "from app.utils.file_utils import parse\n\nclass ApiService:\n    pass\n"
        elif path == "app/utils/file_utils.py":
            return "def parse():\n    return True\n"
        return ""

    monkeypatch.setattr(GitHubService, "fetch_repo_metadata", mock_fetch_repo_metadata)
    monkeypatch.setattr(GitHubService, "fetch_repo_tree", mock_fetch_repo_tree)
    monkeypatch.setattr(GitHubService, "fetch_file_content", mock_fetch_file_content)

    # 1. Trigger POST /api/repositories/analyze
    response = client.post("/api/repositories/analyze", json={"url": "https://github.com/testowner/testrepo"})
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "completed"
    repo_id = data["repository_id"]
    assert repo_id is not None
    assert data["file_count"] == 3

    # 2. Test GET /api/repositories/{id}
    res_repo = client.get(f"/api/repositories/{repo_id}")
    assert res_repo.status_code == 200
    repo_data = res_repo.json()
    assert repo_data["name"] == "testrepo"
    assert repo_data["owner"] == "testowner"
    assert repo_data["status"] == "completed"

    # 3. Test GET /api/repositories/{id}/graph
    res_graph = client.get(f"/api/repositories/{repo_id}/graph")
    assert res_graph.status_code == 200
    graph_data = res_graph.json()
    assert len(graph_data["nodes"]) == 3
    assert len(graph_data["edges"]) >= 2
    assert graph_data["metrics"]["node_count"] == 3
    assert graph_data["metrics"]["edge_count"] >= 2

    # 4. Test GET /api/repositories/{id}/files
    res_files = client.get(f"/api/repositories/{repo_id}/files")
    assert res_files.status_code == 200
    files_list = res_files.json()
    assert len(files_list) == 3

    main_file = next(f for f in files_list if f["path"] == "app/main.py")
    main_file_id = main_file["id"]

    # 5. Test GET /api/repositories/{id}/files/{file_id}
    res_file_detail = client.get(f"/api/repositories/{repo_id}/files/{main_file_id}")
    assert res_file_detail.status_code == 200
    detail_data = res_file_detail.json()
    assert detail_data["file"]["path"] == "app/main.py"
    assert len(detail_data["symbols"]) >= 1
    assert len(detail_data["outgoing_relationships"]) >= 1

    # 6. Test GET /api/repositories/{id}/dependencies
    res_deps = client.get(f"/api/repositories/{repo_id}/dependencies")
    assert res_deps.status_code == 200
    deps_data = res_deps.json()
    assert deps_data["total_nodes"] == 3
    assert deps_data["total_edges"] >= 2
