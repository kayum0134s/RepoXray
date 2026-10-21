import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.utils.security import validate_and_parse_github_url
from app.services.github_service import GitHubService

@pytest.fixture
def anyio_backend():
    return "asyncio"

def test_validate_and_parse_github_url_valid():
    """Test valid GitHub repository URL formats."""
    owner, repo, branch = validate_and_parse_github_url("https://github.com/octocat/Hello-World")
    assert owner == "octocat"
    assert repo == "Hello-World"
    assert branch is None

    owner, repo, branch = validate_and_parse_github_url("https://github.com/fastapi/fastapi.git")
    assert owner == "fastapi"
    assert repo == "fastapi"
    assert branch is None

    owner, repo, branch = validate_and_parse_github_url("https://github.com/facebook/react/tree/main")
    assert owner == "facebook"
    assert repo == "react"
    assert branch == "main"

    owner, repo, branch = validate_and_parse_github_url("https://github.com/vercel/next.js/tree/canary/packages")
    assert owner == "vercel"
    assert repo == "next.js"
    assert branch == "canary/packages"

def test_validate_and_parse_github_url_invalid():
    """Test malformed and dangerous repository URLs."""
    invalid_urls = [
        "",
        "http://evil.com/repo",
        "https://github.com/",
        "https://github.com/owner",
        "https://github.com/owner/repo; rm -rf /",
        "https://github.com/owner/repo?query=1",
        "file:///etc/passwd",
        "https://github.com/../etc/passwd",
        "https://127.0.0.1/owner/repo",
        "ssh://git@github.com:owner/repo.git",
        "https://github.com/owner/repo with spaces",
    ]

    for url in invalid_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_and_parse_github_url(url)
        assert exc_info.value.status_code == 400

def test_github_service_instance():
    service = GitHubService()
    assert service.headers["User-Agent"] == "RepoXray-Architecture-Visualizer/1.0"

@pytest.mark.anyio
async def test_fetch_repo_metadata_mocked():
    service = GitHubService()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "name": "Hello-World",
        "owner": {"login": "octocat"},
        "html_url": "https://github.com/octocat/Hello-World",
        "default_branch": "master",
        "description": "Test repo",
        "language": "C",
        "size": 50,
        "stargazers_count": 10,
        "forks_count": 2,
    }

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        meta = await service.fetch_repo_metadata("octocat", "Hello-World")
        assert meta["name"] == "Hello-World"
        assert meta["owner"] == "octocat"
        assert meta["default_branch"] == "master"
