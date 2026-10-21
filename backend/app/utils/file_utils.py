import os
from typing import Set, Optional

# Default configurable set of ignored directories and files
DEFAULT_IGNORED_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "ENV",
    "env",
    ".env",
    "__pycache__",
    "dist",
    "build",
    "coverage",
    ".next",
    ".cache",
    ".pytest_cache",
    ".idea",
    ".vscode",
    ".DS_Store",
    "Thumbs.db",
}

# Default binary/non-text file extensions
BINARY_EXTENSIONS: Set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp3", ".mp4", ".webm", ".avi", ".mov", ".wav",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2",
    ".db", ".sqlite", ".sqlite3", ".pyc", ".pyo", ".pyd",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}

# Language mapping dict
EXTENSION_LANGUAGE_MAP = {
    # Supported core languages explicitly required:
    ".py": "Python",
    ".pyi": "Python",
    ".pyx": "Python",
    ".pyw": "Python",
    ".js": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    ".tsx": "TSX",
    ".jsx": "JSX",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "CSS",
    ".sass": "CSS",
    ".less": "CSS",
    ".json": "JSON",
    ".json5": "JSON",
    ".jsonc": "JSON",
    ".md": "Markdown",
    ".markdown": "Markdown",
    ".mdx": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".sql": "SQL",
    # Secondary support languages:
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".c": "C",
    ".cpp": "C++",
    ".cc": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C/C++ Header",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
}

def is_ignored_path(path: str, custom_ignore_dirs: Optional[Set[str]] = None) -> bool:
    """
    Check if a file path or directory should be ignored during scanning.
    Supports default and configurable custom ignore sets.
    """
    if not path:
        return False

    ignored_dirs = custom_ignore_dirs if custom_ignore_dirs is not None else DEFAULT_IGNORED_DIRS

    # Normalize path separators
    clean_path = path.replace("\\", "/")
    parts = clean_path.split("/")

    for part in parts:
        if part in ignored_dirs:
            return True
        # Ignore hidden environment files starting with .env
        if part.startswith(".env") and part != ".env.example":
            return True

    filename = os.path.basename(clean_path)
    ext = os.path.splitext(filename)[1].lower()

    if ext in BINARY_EXTENSIONS:
        return True

    return False


def is_binary_file(filename: str, sample_bytes: Optional[bytes] = None) -> bool:
    """
    Determine if a file is binary using extension matching and null byte sampling.
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext in BINARY_EXTENSIONS:
        return True

    if sample_bytes:
        # If null byte exists in sample, classify as binary
        if b"\x00" in sample_bytes[:1024]:
            return True

    return False


def get_language_by_extension(filepath: str) -> str:
    """
    Detect programming language based on file extension and filename metadata.
    """
    filename = os.path.basename(filepath)
    lower_filename = filename.lower()

    # Special filename metadata checks
    if lower_filename in ("dockerfile", "dockerfile.dev", "dockerfile.prod"):
        return "Dockerfile"
    if lower_filename in ("makefile", "gnumakefile"):
        return "Makefile"
    if lower_filename in (".gitignore", ".dockerignore", ".eslintignore"):
        return "Gitignore"
    if lower_filename == "package.json":
        return "JSON"

    _, ext = os.path.splitext(filename)
    ext_lower = ext.lower()

    return EXTENSION_LANGUAGE_MAP.get(ext_lower, "Unknown")


def count_lines(content: str | bytes) -> int:
    """
    Safely count lines in a text buffer. Returns 0 for empty or binary input.
    """
    if not content:
        return 0

    if isinstance(content, bytes):
        if is_binary_file("file.bin", content):
            return 0
        try:
            content = content.decode("utf-8", errors="replace")
        except Exception:
            return 0

    return content.count("\n") + (1 if content and not content.endswith("\n") else 0)
