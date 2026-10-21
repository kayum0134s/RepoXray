from typing import Dict, Any, List
import tree_sitter_languages
from app.parsers.javascript_parser import JavaScriptParser
from app.utils.logger import logger

class TypeScriptParser(JavaScriptParser):
    """AST-based TypeScript/TSX source code parser extending JavaScriptParser via Tree-sitter."""

    def __init__(self, is_tsx: bool = False):
        lang_name = "tsx" if is_tsx else "typescript"
        super().__init__(language_name=lang_name)

    def _traverse_node(
        self,
        node: Any,
        code_bytes: bytes,
        symbols: List[Dict[str, Any]],
        imports: List[Dict[str, Any]],
        exports: List[Dict[str, Any]]
    ):
        node_type = node.type
        line_num = node.start_point[0] + 1

        # TypeScript Interfaces
        if node_type == "interface_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                if_name = self._node_text(name_node, code_bytes)
                symbols.append({"name": if_name, "type": "interface", "line_number": line_num})

        # TypeScript Type Aliases
        elif node_type == "type_alias_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                type_name = self._node_text(name_node, code_bytes)
                symbols.append({"name": type_name, "type": "type", "line_number": line_num})

        # TypeScript Enums
        elif node_type == "enum_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                enum_name = self._node_text(name_node, code_bytes)
                symbols.append({"name": enum_name, "type": "enum", "line_number": line_num})

        # Delegate base JS/JSX node extraction
        super()._traverse_node(node, code_bytes, symbols, imports, exports)
