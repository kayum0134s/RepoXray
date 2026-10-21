import os
import httpx
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from app.utils.logger import logger
from app.utils.security import validate_and_parse_github_url

class GitHubService:
    """Service handling GitHub REST API calls and public repository ingestion."""

    BASE_URL = "https://api.github.com"

    def __init__(self, api_token: Optional[str] = None):
        token = api_token or os.getenv("GITHUB_TOKEN")
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RepoXray-Architecture-Visualizer/1.0"
        }
        if token:
            # Use Bearer or token header
            self.headers["Authorization"] = f"Bearer {token}"
            logger.info("GitHubService initialized with API authentication token.")
        else:
            logger.info("GitHubService initialized in unauthenticated public mode.")

    def parse_url(self, url: str) -> tuple[str, str, Optional[str]]:
        """Validate and extract (owner, repo, optional branch) from GitHub URL."""
        return validate_and_parse_github_url(url)

    async def fetch_repo_metadata(self, owner: str, repo: str) -> Dict[str, Any]:
        """
        Fetch basic repository metadata from GitHub REST API.
        Handles 404 Not Found, 403 Rate Limit, network errors.
        """
        endpoint = f"{self.BASE_URL}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            try:
                response = await client.get(endpoint, headers=self.headers)
            except httpx.RequestError as exc:
                logger.error(f"Network error connecting to GitHub API for {owner}/{repo}: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Network error communicating with GitHub API: {str(exc)}"
                )

        if response.status_code == 404:
            logger.warning(f"Repository not found or private: {owner}/{repo}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"GitHub repository '{owner}/{repo}' was not found or is private/inaccessible."
            )
        elif response.status_code == 403:
            rate_remaining = response.headers.get("X-RateLimit-Remaining")
            if rate_remaining == "0":
                logger.error(f"GitHub API rate limit exceeded when fetching {owner}/{repo}.")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="GitHub API rate limit exceeded. Please configure GITHUB_TOKEN in .env or try again later."
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access to GitHub repository '{owner}/{repo}' is forbidden."
            )
        elif response.status_code != 200:
            logger.error(f"Unexpected status code {response.status_code} fetching {owner}/{repo}: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"GitHub API returned unexpected status code {response.status_code}."
            )

        data = response.json()
        return {
            "name": data.get("name", repo),
            "owner": data.get("owner", {}).get("login", owner),
            "url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
            "default_branch": data.get("default_branch", "main"),
            "description": data.get("description"),
            "language": data.get("language"),
            "size": data.get("size", 0),
            "stargazers_count": data.get("stargazers_count", 0),
            "forks_count": data.get("forks_count", 0),
        }

    async def fetch_repo_tree(self, owner: str, repo: str, branch: str) -> List[Dict[str, Any]]:
        """
        Fetch recursive git tree for a repository branch.
        Returns a list of items (path, mode, type, size, sha).
        """
        endpoint = f"{self.BASE_URL}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(endpoint, headers=self.headers)
            except httpx.RequestError as exc:
                logger.error(f"Network error fetching tree for {owner}/{repo}@{branch}: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Network error fetching repository tree from GitHub API: {str(exc)}"
                )

        if response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch '{branch}' for repository '{owner}/{repo}' was not found."
            )
        elif response.status_code == 403:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS if response.headers.get("X-RateLimit-Remaining") == "0" else status.HTTP_403_FORBIDDEN,
                detail="GitHub API rate limit exceeded or access forbidden while fetching repository tree."
            )
        elif response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"GitHub API tree endpoint returned status code {response.status_code}."
            )

        data = response.json()
        tree_items = data.get("tree", [])
        logger.info(f"Fetched {len(tree_items)} items from repository tree for {owner}/{repo}@{branch}")
        return tree_items

    async def fetch_file_content(self, owner: str, repo: str, path: str, branch: str) -> str:
        """
        Fetch raw text content for a single file in the repository.
        """
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            try:
                response = await client.get(raw_url, headers=self.headers)
                if response.status_code == 200:
                    return response.text
                logger.warning(f"Raw content fetch failed ({response.status_code}) for {path}")
                return ""
            except httpx.RequestError as exc:
                logger.error(f"Error fetching file content for {path}: {exc}")
                return ""
