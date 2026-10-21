import re
from typing import Tuple, Optional
from fastapi import HTTPException, status

# Regex patterns for strict GitHub URL validation
# Matches: https://github.com/owner/repo or http(s)://github.com/owner/repo.git or /tree/branch
GITHUB_URL_REGEX = re.compile(
    r"^https?://github\.com/(?P<owner>[a-zA-Z0-9\-_.]+)/(?P<repo>[a-zA-Z0-9\-_.]+)"
    r"(?:/tree/(?P<branch>[a-zA-Z0-9\-_./]+))?/?$"
)

# Reject dangerous shell metacharacters, control characters, path traversal
DANGEROUS_INPUT_REGEX = re.compile(r"[;&|<>$\"`\s\x00-\x1f]|\.\.")

def validate_and_parse_github_url(url: str) -> Tuple[str, str, Optional[str]]:
    """
    Sanitizes, validates, and extracts (owner, repo, optional branch) from a GitHub URL.

    Rejects:
    - Malformed URLs (non-GitHub, invalid path structure)
    - Dangerous input (shell metacharacters, path traversal, control chars)
    - Localhost, IP addresses, unsupported protocols (file://, ftp://, ssh://)
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must be a non-empty string."
        )

    clean_url = url.strip()

    # Reject dangerous injection patterns
    if DANGEROUS_INPUT_REGEX.search(clean_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL contains invalid or potentially dangerous characters."
        )

    # Reject non-https/http or local/IP targets
    if not (clean_url.startswith("https://github.com/") or clean_url.startswith("http://github.com/")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only public GitHub repository URLs (https://github.com/owner/repo) are supported."
        )

    # Remove trailing .git if present
    if clean_url.endswith(".git"):
        clean_url = clean_url[:-4]

    match = GITHUB_URL_REGEX.match(clean_url)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository URL format. Expected: https://github.com/username/repository"
        )

    owner = match.group("owner")
    repo = match.group("repo")
    branch = match.group("branch")

    # Double-check owner and repo name constraints
    if not owner or owner.startswith(".") or owner.startswith("-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository owner name."
        )

    if not repo or repo.startswith(".") or repo.startswith("-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository name."
        )

    return owner, repo, branch


def sanitize_repo_url(url: str) -> str:
    """Legacy helper for clean URL string generation."""
    owner, repo, branch = validate_and_parse_github_url(url)
    clean = f"https://github.com/{owner}/{repo}"
    if branch:
        clean += f"/tree/{branch}"
    return clean


def parse_repo_owner_name(url: str) -> Tuple[str, str]:
    """Legacy helper for owner and repo extraction."""
    owner, repo, _ = validate_and_parse_github_url(url)
    return owner, repo
