import pytest
from fastapi import HTTPException
from app.utils.security import validate_and_parse_github_url
from app.parsers.python_parser import PythonParser
from app.parsers.javascript_parser import JavaScriptParser
from app.parsers.typescript_parser import TypeScriptParser
from app.services.scanner_service import ScannerService
from app.services.ai_providers import EvidenceFallbackProvider

@pytest.fixture
def anyio_backend():
    return 'asyncio'

def test_security_malicious_urls_rejected():
    """Verify that command injection and path traversal attempts are rejected."""
    invalid_urls = [
        "https://github.com/owner/repo; rm -rf /",
        "https://github.com/owner/repo$(whoami)",
        "https://github.com/../etc/passwd",
        "file:///etc/passwd",
        "http://malicious-site.com/repo",
        "https://github.com/-invalid/repo",
        "",
        None,
    ]
    for url in invalid_urls:
        with pytest.raises(HTTPException) as exc_info:
            validate_and_parse_github_url(url)
        assert exc_info.value.status_code == 400

def test_security_valid_urls_accepted():
    """Verify valid GitHub URLs pass sanitization and validation."""
    valid = "https://github.com/pallets/markupsafe"
    owner, repo, branch = validate_and_parse_github_url(valid)
    assert owner == "pallets"
    assert repo == "markupsafe"
    assert branch is None

def test_parser_fault_tolerance_malformed_syntax():
    """Verify AST parsers do not crash on malformed source code syntax."""
    malformed_py = "def broken_func(:\n    pass bad syntax {{{"
    py_parser = PythonParser()
    res_py = py_parser.parse_source(malformed_py, "broken.py")
    assert res_py["parsed_successfully"] is False or isinstance(res_py["symbols"], list)

    malformed_js = "function broken(a b c) { const x = ; return; }"
    js_parser = JavaScriptParser()
    res_js = js_parser.parse_source(malformed_js, "broken.js")
    assert isinstance(res_js["symbols"], list)

    malformed_ts = "interface { string invalid syntax"
    ts_parser = TypeScriptParser()
    res_ts = ts_parser.parse_source(malformed_ts, "broken.ts")
    assert isinstance(res_ts["symbols"], list)

def test_scanner_ignore_rules_and_safety_limits():
    """Verify scanner ignores binary/node_modules files and respects safety limits."""
    scanner = ScannerService()
    items = [
        {"path": "src/app.ts", "type": "blob", "size": 1500},
        {"path": "node_modules/express/index.js", "type": "blob", "size": 5000},
        {"path": "dist/bundle.js", "type": "blob", "size": 200000},
        {"path": ".git/config", "type": "blob", "size": 300},
        {"path": "image.png", "type": "blob", "size": 80000},
    ]
    scanned = scanner.scan_git_tree(items)
    paths = [f["path"] for f in scanned]
    assert "src/app.ts" in paths
    assert "node_modules/express/index.js" not in paths
    assert ".git/config" not in paths
    assert "image.png" not in paths

@pytest.mark.anyio
async def test_evidence_fallback_provider():
    """Verify EvidenceFallbackProvider produces deterministic responses without crashing."""
    provider = EvidenceFallbackProvider()
    ctx = {
        "target": "repository",
        "repo_name": "test/repo",
        "file_count": 15,
        "hotspots": [{"path": "core/api.py", "connections": 10, "role_description": "API Router"}],
        "cycles": []
    }
    ans = await provider.generate("Explain repository", "System", ctx)
    assert "test/repo" in ans
    assert "15 files" in ans
