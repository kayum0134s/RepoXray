import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db

@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database tables exist before running tests."""
    init_db()

def test_analyze_repository_invalid_url():
    """Test POST /api/repositories/analyze rejecting invalid URLs."""
    with TestClient(app) as client:
        response = client.post("/api/repositories/analyze", json={"url": "invalid-url"})
        assert response.status_code == 400
        assert response.json()["status"] == "error"
        assert "Only public GitHub repository URLs" in response.json()["detail"]

def test_analyze_repository_dangerous_url():
    """Test POST /api/repositories/analyze rejecting injection attempts."""
    with TestClient(app) as client:
        response = client.post("/api/repositories/analyze", json={"url": "https://github.com/user/repo; rm -rf /"})
        assert response.status_code == 400
        assert response.json()["status"] == "error"

@patch("app.api.repositories.GitHubService")
def test_analyze_repository_success(mock_github_service_class):
    """Test POST /api/repositories/analyze successful ingestion with mocked GitHub API."""
    mock_instance = MagicMock()
    mock_github_service_class.return_value = mock_instance

    # Mock parse_url (synchronous method)
    mock_instance.parse_url.return_value = ("octocat", "Hello-World", None)

    # Mock async methods fetch_repo_metadata and fetch_repo_tree
    mock_instance.fetch_repo_metadata = AsyncMock(return_value={
        "name": "Hello-World",
        "owner": "octocat",
        "url": "https://github.com/octocat/Hello-World",
        "default_branch": "master",
        "description": "My first repository on GitHub!",
        "language": "C",
        "size": 100,
        "stargazers_count": 1500,
        "forks_count": 200,
    })

    mock_instance.fetch_repo_tree = AsyncMock(return_value=[
        {"path": "README.md", "type": "blob", "size": 50},
        {"path": "main.c", "type": "blob", "size": 120},
        {"path": "src", "type": "tree", "size": 0},
        {"path": "src/utils.c", "type": "blob", "size": 200},
    ])

    mock_instance.fetch_file_content = AsyncMock(return_value="")


    with TestClient(app) as client:
        response = client.post(
            "/api/repositories/analyze",
            json={"url": "https://github.com/octocat/Hello-World"}
        )

        assert response.status_code == 201
        data = response.json()
        assert "analysis_id" in data
        assert "repository_id" in data
        assert data["name"] == "Hello-World"
        assert data["owner"] == "octocat"
        assert data["default_branch"] == "master"
        assert data["file_count"] == 3  # 3 blobs (excluding directory tree item)
        assert data["status"] == "completed"
