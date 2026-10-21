from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseParser(ABC):
    """Abstract base class for language-specific AST source code parsers."""

    @abstractmethod
    def parse_source(self, code_content: str, file_path: str) -> Dict[str, Any]:
        """
        Parse source code content and extract symbols (classes, functions, interfaces, types, components)
        and import/export statements.

        Returns a dictionary with standard keys:
            - symbols: List[Dict[str, Any]]  ({"name": str, "type": str, "line_number": int})
            - imports: List[Dict[str, Any]]  ({"module": str, "imported_symbol": Optional[str], "line_number": int})
            - exports: List[Dict[str, Any]]  ({"name": str, "line_number": int})
            - parsed_successfully: bool
            - error: Optional[str]
        """
        pass
