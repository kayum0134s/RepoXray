import ast
from typing import Dict, Any, List
from app.parsers.base_parser import BaseParser
from app.utils.logger import logger

class PythonParser(BaseParser):
    """AST-based Python source code parser using Python's standard `ast` module."""

    def parse_source(self, code_content: str, file_path: str) -> Dict[str, Any]:
        symbols: List[Dict[str, Any]] = []
        imports: List[Dict[str, Any]] = []
        exports: List[Dict[str, Any]] = []
        parsed_successfully = True
        error_msg = None

        if not code_content or not code_content.strip():
            return {
                "symbols": symbols,
                "imports": imports,
                "exports": exports,
                "parsed_successfully": True,
                "error": None
            }

        try:
            tree = ast.parse(code_content, filename=file_path)

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    symbols.append({
                        "name": node.name,
                        "type": "class",
                        "line_number": getattr(node, "lineno", 1)
                    })
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    # Check if top-level or method
                    symbols.append({
                        "name": node.name,
                        "type": "function",
                        "line_number": getattr(node, "lineno", 1)
                    })
                elif isinstance(node, ast.Import):
                    lineno = getattr(node, "lineno", 1)
                    for alias in node.names:
                        imports.append({
                            "module": alias.name,
                            "imported_symbol": alias.asname or alias.name,
                            "line_number": lineno
                        })
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ""
                    lineno = getattr(node, "lineno", 1)
                    for alias in node.names:
                        imports.append({
                            "module": module,
                            "imported_symbol": alias.name,
                            "line_number": lineno
                        })
                elif isinstance(node, ast.Assign):
                    # Top level variable assignments
                    lineno = getattr(node, "lineno", 1)
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            # Ignore dunder names like __all__, __name__
                            if not target.id.startswith("__"):
                                symbols.append({
                                    "name": target.id,
                                    "type": "variable",
                                    "line_number": lineno
                                })

        except (SyntaxError, ValueError, Exception) as err:
            logger.warning(f"Python AST parse error in '{file_path}': {err}")
            parsed_successfully = False
            error_msg = f"Syntax/AST error: {str(err)}"

        return {
            "symbols": symbols,
            "imports": imports,
            "exports": exports,
            "parsed_successfully": parsed_successfully,
            "error": error_msg
        }
