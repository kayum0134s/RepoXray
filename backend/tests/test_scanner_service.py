import os
import tempfile
import pytest
from app.services.scanner_service import ScannerService
from app.utils.file_utils import is_ignored_path, get_language_by_extension, is_binary_file, count_lines

def test_language_detection_supported():
    """Verify explicit language detection requirements."""
    assert get_language_by_extension("main.py") == "Python"
    assert get_language_by_extension("index.js") == "JavaScript"
    assert get_language_by_extension("app.ts") == "TypeScript"
    assert get_language_by_extension("Component.tsx") == "TSX"
    assert get_language_by_extension("View.jsx") == "JSX"
    assert get_language_by_extension("index.html") == "HTML"
    assert get_language_by_extension("styles.css") == "CSS"
    assert get_language_by_extension("data.json") == "JSON"
    assert get_language_by_extension("README.md") == "Markdown"
    assert get_language_by_extension("config.yaml") == "YAML"
    assert get_language_by_extension("config.yml") == "YAML"
    assert get_language_by_extension("schema.sql") == "SQL"

def test_language_detection_unknown_and_special():
    """Verify unknown extensions and special filenames."""
    assert get_language_by_extension("file.unknown_extension_xyz") == "Unknown"
    assert get_language_by_extension("Dockerfile") == "Dockerfile"
    assert get_language_by_extension("Makefile") == "Makefile"
    assert get_language_by_extension(".gitignore") == "Gitignore"

def test_ignore_rules():
    """Verify default ignore directory rules."""
    ignored_paths = [
        ".git/HEAD",
        "node_modules/express/index.js",
        "venv/lib/python3.11/site-packages/pkg.py",
        ".venv/bin/activate",
        ".env",
        ".env.local",
        "__pycache__/main.cpython-311.pyc",
        "dist/bundle.js",
        "build/static/js/main.js",
        "coverage/lcov.info",
        ".next/static/chunks/app.js",
        ".cache/babel-loader/cache.json",
        "image.png",
        "archive.zip",
    ]

    for path in ignored_paths:
        assert is_ignored_path(path) is True, f"Expected '{path}' to be ignored"

    # Non-ignored path
    assert is_ignored_path("src/components/Header.tsx") is False
    assert is_ignored_path("backend/app/main.py") is False

def test_configurable_ignore_rules():
    """Verify custom configurable ignore rules."""
    custom_ignore = {".git", "custom_folder", "temp"}
    assert is_ignored_path("custom_folder/file.txt", custom_ignore) is True
    assert is_ignored_path("normal_folder/file.txt", custom_ignore) is False

def test_binary_file_detection_and_line_counting():
    """Verify binary file classification and line count calculations."""
    text_content = "def hello():\n    print('Hello World')\n"
    assert count_lines(text_content) == 2

    # Binary byte content with null bytes
    binary_content = b"\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    assert is_binary_file("compiled.so", binary_content) is True
    assert count_lines(binary_content) == 0

def test_scan_git_tree_filtering_and_normalization():
    """Test scan_git_tree with a mixture of normal, ignored, binary, and unknown files."""
    scanner = ScannerService()
    raw_tree = [
        {"path": ".git/config", "type": "blob", "size": 100},
        {"path": "node_modules/react/index.js", "type": "blob", "size": 500},
        {"path": "src/main.py", "type": "blob", "size": 400},
        {"path": "src/App.tsx", "type": "blob", "size": 800},
        {"path": "docs/readme.md", "type": "blob", "size": 200},
        {"path": "assets/logo.png", "type": "blob", "size": 1024},
        {"path": "data/query.sql", "type": "blob", "size": 150},
        {"path": "custom.unknown", "type": "blob", "size": 60},
        {"path": "src", "type": "tree", "size": 0},  # folder node
    ]

    scanned = scanner.scan_git_tree(raw_tree)
    paths = [f["path"] for f in scanned]

    assert ".git/config" not in paths
    assert "node_modules/react/index.js" not in paths
    assert "assets/logo.png" not in paths  # binary extension ignored
    assert "src/main.py" in paths
    assert "src/App.tsx" in paths
    assert "docs/readme.md" in paths
    assert "data/query.sql" in paths
    assert "custom.unknown" in paths

    # Verify language detection results
    lang_map = {f["path"]: f["language"] for f in scanned}
    assert lang_map["src/main.py"] == "Python"
    assert lang_map["src/App.tsx"] == "TSX"
    assert lang_map["docs/readme.md"] == "Markdown"
    assert lang_map["data/query.sql"] == "SQL"
    assert lang_map["custom.unknown"] == "Unknown"

def test_scan_local_directory_with_temp_files():
    """Test scanner on local filesystem directory including ignored dirs, binary, large, and unknown files."""
    scanner = ScannerService(max_file_size_bytes=100)  # set small max file size limit for testing

    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create normal files
        py_file = os.path.join(tmp_dir, "app.py")
        with open(py_file, "w") as f:
            f.write("line 1\nline 2\nline 3\n")

        ts_file = os.path.join(tmp_dir, "index.ts")
        with open(ts_file, "w") as f:
            f.write("console.log('hi');\n")

        # Create ignored dir & file
        git_dir = os.path.join(tmp_dir, ".git")
        os.makedirs(git_dir)
        with open(os.path.join(git_dir, "config"), "w") as f:
            f.write("git config")

        node_dir = os.path.join(tmp_dir, "node_modules")
        os.makedirs(node_dir)
        with open(os.path.join(node_dir, "package.json"), "w") as f:
            f.write("{}")

        # Create large file (> 100 bytes limit)
        large_file = os.path.join(tmp_dir, "large.py")
        with open(large_file, "w") as f:
            f.write("x = 1\n" * 50)  # > 100 bytes

        # Create binary file
        bin_file = os.path.join(tmp_dir, "data.bin")
        with open(bin_file, "wb") as f:
            f.write(b"\x00\x01\x02\x03\x04\x05")

        scanned = scanner.scan_local_directory(tmp_dir)
        paths = [f["path"] for f in scanned]

        assert "app.py" in paths
        assert "index.ts" in paths
        assert "large.py" in paths
        assert ".git/config" not in paths
        assert "node_modules/package.json" not in paths

        file_dict = {f["path"]: f for f in scanned}
        assert file_dict["app.py"]["line_count"] == 3
        assert file_dict["index.ts"]["line_count"] == 1
        # Large file should have line_count 0 due to exceeding max_file_size_bytes
        assert file_dict["large.py"]["line_count"] == 0
        # Binary file line_count 0 or filtered
        if "data.bin" in file_dict:
            assert file_dict["data.bin"]["line_count"] == 0

def test_scan_empty_repository():
    """Test scanner against an empty directory or empty git tree."""
    scanner = ScannerService()
    scanned_tree = scanner.scan_git_tree([])
    assert scanned_tree == []

    with tempfile.TemporaryDirectory() as empty_dir:
        scanned_local = scanner.scan_local_directory(empty_dir)
        assert scanned_local == []
