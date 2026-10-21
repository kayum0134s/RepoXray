import uuid
import os
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.symbol import SymbolModel
from app.parsers.base_parser import BaseParser
from app.parsers.python_parser import PythonParser
from app.parsers.javascript_parser import JavaScriptParser
from app.parsers.typescript_parser import TypeScriptParser
from app.utils.file_utils import get_language_by_extension
from app.utils.logger import logger

class ParserService:
    """Service routing source code parsing and persisting extracted symbols to database."""

    def __init__(self):
        self.py_parser = PythonParser()
        self.js_parser = JavaScriptParser()
        self.ts_parser = TypeScriptParser(is_tsx=False)
        self.tsx_parser = TypeScriptParser(is_tsx=True)

    def get_parser_for_file(self, filepath: str) -> Optional[BaseParser]:
        """Determine appropriate BaseParser instance based on file extension and language."""
        language = get_language_by_extension(filepath)
        _, ext = os.path.splitext(filepath)
        ext_lower = ext.lower()

        if language == "Python" or ext_lower in (".py", ".pyi", ".pyx", ".pyw"):
            return self.py_parser
        elif language in ("JavaScript", "JSX") or ext_lower in (".js", ".mjs", ".cjs", ".jsx"):
            return self.js_parser
        elif language == "TSX" or ext_lower == ".tsx":
            return self.tsx_parser
        elif language == "TypeScript" or ext_lower in (".ts", ".mts", ".cts"):
            return self.ts_parser

        return None

    def parse_file(self, code_content: str, filepath: str) -> Dict[str, Any]:
        """
        Safely parse code content for a file path. Returns normalized dictionary containing
        symbols, imports, exports, and status flags.
        """
        parser = self.get_parser_for_file(filepath)
        if not parser:
            return {
                "symbols": [],
                "imports": [],
                "exports": [],
                "parsed_successfully": True,
                "error": None
            }

        try:
            return parser.parse_source(code_content, filepath)
        except Exception as err:
            logger.warning(f"Error parsing file '{filepath}': {err}")
            return {
                "symbols": [],
                "imports": [],
                "exports": [],
                "parsed_successfully": False,
                "error": str(err)
            }

    def save_file_symbols(
        self,
        repository_id: str,
        file_id: str,
        code_content: str,
        filepath: str,
        db: Session
    ) -> List[SymbolModel]:
        """
        Parse source code and persist normalized symbol records into SQLite database.
        Fault-tolerant: syntax errors in single files will not crash process.
        """
        parse_result = self.parse_file(code_content, filepath)
        symbols_data = parse_result.get("symbols", [])
        symbol_models = []

        for sym in symbols_data:
            sym_id = str(uuid.uuid4())
            model = SymbolModel(
                id=sym_id,
                file_id=file_id,
                repository_id=repository_id,
                name=sym["name"],
                type=sym["type"],
                line_number=sym.get("line_number")
            )
            symbol_models.append(model)

        if symbol_models:
            db.bulk_save_objects(symbol_models)
            db.commit()

        return symbol_models
