import os
import time
from typing import List, Dict, Any, Optional, Set
from app.utils.file_utils import (
    is_ignored_path,
    is_binary_file,
    get_language_by_extension,
    count_lines,
    DEFAULT_IGNORED_DIRS
)
from app.utils.logger import logger

# Safety and performance limits
MAX_REPO_FILE_COUNT = 100000          # Max total files scanned per repository
MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB max file size for line counting / text loading
MAX_SCAN_DURATION_SECONDS = 60.0       # 60s timeout limit for scanner loop

class ScannedFile:
    """Normalized internal representation of a scanned file item."""
    def __init__(
        self,
        path: str,
        name: str,
        extension: str,
        language: str,
        size_bytes: int,
        line_count: int,
        is_binary: bool = False
    ):
        self.path = path
        self.name = name
        self.extension = extension
        self.language = language
        self.size_bytes = size_bytes
        self.line_count = line_count
        self.is_binary = is_binary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "name": self.name,
            "extension": self.extension,
            "language": self.language,
            "size_bytes": self.size_bytes,
            "line_count": self.line_count,
            "is_binary": self.is_binary
        }

class ScannerService:
    """
    Repository scanner responsible for traversing, filtering, profiling,
    and computing normalized file statistics.
    """

    def __init__(
        self,
        custom_ignored_dirs: Optional[Set[str]] = None,
        max_file_size_bytes: int = MAX_FILE_SIZE_BYTES,
        max_repo_files: int = MAX_REPO_FILE_COUNT
    ):
        self.ignored_dirs = custom_ignored_dirs if custom_ignored_dirs is not None else DEFAULT_IGNORED_DIRS
        self.max_file_size_bytes = max_file_size_bytes
        self.max_repo_files = max_repo_files

    def scan_git_tree(
        self,
        tree_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Scan and normalize raw git tree objects (from GitHub API).
        Filters out ignored paths, profiles languages, and estimates line counts.
        """
        scanned_files: List[Dict[str, Any]] = []
        start_time = time.time()

        for item in tree_items:
            # Enforce max duration safety limit
            if time.time() - start_time > MAX_SCAN_DURATION_SECONDS:
                logger.warning("Scanner exceeded max scan duration limit. Truncating scanning.")
                break

            # Enforce max file count limit
            if len(scanned_files) >= self.max_repo_files:
                logger.warning(f"Scanner reached max file limit ({self.max_repo_files}). Truncating.")
                break

            path = item.get("path", "").replace("\\", "/")
            item_type = item.get("type", "blob")
            size_bytes = item.get("size", 0) or 0

            # Ignore directories in file list output, or filter ignored directory paths
            if item_type == "tree" or is_ignored_path(path, self.ignored_dirs):
                continue

            filename = os.path.basename(path)
            _, ext = os.path.splitext(filename)
            ext_lower = ext.lower()
            language = get_language_by_extension(path)
            binary_flag = is_binary_file(filename)

            # Estimate line count for code files if size is under limit
            estimated_line_count = 0
            if not binary_flag and size_bytes > 0:
                if size_bytes <= self.max_file_size_bytes:
                    # Average ~40 bytes per line estimation for remote tree blobs when content isn't pre-fetched
                    estimated_line_count = max(1, size_bytes // 40)

            scanned = ScannedFile(
                path=path,
                name=filename,
                extension=ext_lower if ext_lower else "",
                language=language,
                size_bytes=size_bytes,
                line_count=estimated_line_count,
                is_binary=binary_flag
            )
            scanned_files.append(scanned.to_dict())

        logger.info(f"Scanner processed {len(scanned_files)} files from git tree.")
        return scanned_files

    def scan_local_directory(
        self,
        root_path: str
    ) -> List[Dict[str, Any]]:
        """
        Scan local directory structure recursively.
        Filters out ignored paths, computes file size and exact line counts for text files.
        """
        scanned_files: List[Dict[str, Any]] = []
        start_time = time.time()

        if not os.path.exists(root_path):
            logger.warning(f"Root path '{root_path}' does not exist.")
            return scanned_files

        for dirpath, dirnames, filenames in os.walk(root_path, topdown=True):
            # Prune ignored directories in-place during directory traversal
            dirnames[:] = [
                d for d in dirnames
                if not is_ignored_path(os.path.join(dirpath, d), self.ignored_dirs)
            ]

            # Timeout check
            if time.time() - start_time > MAX_SCAN_DURATION_SECONDS:
                logger.warning("Scanner exceeded max scan duration. Truncating local walk.")
                break

            for fname in filenames:
                if len(scanned_files) >= self.max_repo_files:
                    break

                full_path = os.path.join(dirpath, fname)
                rel_path = os.path.relpath(full_path, root_path).replace("\\", "/")

                if is_ignored_path(rel_path, self.ignored_dirs):
                    continue

                size_bytes = os.path.getsize(full_path) if os.path.exists(full_path) else 0
                ext = os.path.splitext(fname)[1].lower()
                language = get_language_by_extension(fname)
                binary_flag = is_binary_file(fname)

                line_count = 0
                if not binary_flag and size_bytes <= self.max_file_size_bytes and size_bytes > 0:
                    try:
                        with open(full_path, "rb") as f:
                            sample = f.read(1024)
                            if is_binary_file(fname, sample):
                                binary_flag = True
                            else:
                                f.seek(0)
                                content = f.read().decode("utf-8", errors="replace")
                                line_count = count_lines(content)
                    except Exception as err:
                        logger.warning(f"Could not read line count for '{rel_path}': {err}")

                scanned = ScannedFile(
                    path=rel_path,
                    name=fname,
                    extension=ext,
                    language=language,
                    size_bytes=size_bytes,
                    line_count=line_count,
                    is_binary=binary_flag
                )
                scanned_files.append(scanned.to_dict())

        logger.info(f"Local scanner processed {len(scanned_files)} files in '{root_path}'.")
        return scanned_files
