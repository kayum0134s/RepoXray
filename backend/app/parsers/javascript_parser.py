from typing import Dict, Any, List, Optional
import tree_sitter_languages
from app.parsers.base_parser import BaseParser
from app.utils.logger import logger

class JavaScriptParser(BaseParser):
    """AST-based JavaScript/JSX source code parser using Tree-sitter."""

    def __init__(self, language_name: str = "javascript"):
        self.language_name = language_name
        try:
            self.parser = tree_sitter_languages.get_parser(language_name)
        except Exception as err:
            logger.error(f"Failed to load Tree-sitter parser for '{language_name}': {err}")
            self.parser = None

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

        if not self.parser:
            return {
                "symbols": symbols,
                "imports": imports,
                "exports": exports,
                "parsed_successfully": False,
                "error": f"Tree-sitter parser for '{self.language_name}' unavailable."
            }

        try:
            code_bytes = code_content.encode("utf-8", errors="replace")
            tree = self.parser.parse(code_bytes)
            root_node = tree.root_node

            if root_node.has_error:
                # Flag partial parse warning for malformed code
                parsed_successfully = False
                error_msg = "AST contains syntax/parse errors"

            self._traverse_node(root_node, code_bytes, symbols, imports, exports)

        except Exception as err:
            logger.warning(f"JavaScript Tree-sitter parse exception in '{file_path}': {err}")
            parsed_successfully = False
            error_msg = f"Tree-sitter error: {str(err)}"

        return {
            "symbols": symbols,
            "imports": imports,
            "exports": exports,
            "parsed_successfully": parsed_successfully,
            "error": error_msg
        }

    def _traverse_node(
        self,
        node: Any,
        code_bytes: bytes,
        symbols: List[Dict[str, Any]],
        imports: List[Dict[str, Any]],
        exports: List[Dict[str, Any]]
    ):
        """Recursively walk tree-sitter AST nodes to extract language symbols."""
        node_type = node.type
        line_num = node.start_point[0] + 1

        # 1. Imports
        if node_type == "import_statement":
            source_node = node.child_by_field_name("source")
            module_name = self._node_text(source_node, code_bytes).strip("'\"") if source_node else ""
            
            # Extract imported symbols from clause
            clause = node.child_by_field_name("clause") or node
            imported_symbols = []
            for child in clause.children:
                if child.type in ("identifier", "import_specifier", "namespace_import"):
                    sym_name = self._node_text(child, code_bytes).strip()
                    if sym_name:
                        imported_symbols.append(sym_name)

            if not imported_symbols:
                imports.append({"module": module_name, "imported_symbol": None, "line_number": line_num})
            else:
                for sym in imported_symbols:
                    imports.append({"module": module_name, "imported_symbol": sym, "line_number": line_num})

        elif node_type == "call_expression":
            # CommonJS require('module')
            fn_node = node.child_by_field_name("function")
            if fn_node and self._node_text(fn_node, code_bytes) == "require":
                args_node = node.child_by_field_name("arguments")
                if args_node and args_node.child_count > 1:
                    module_name = self._node_text(args_node.children[1], code_bytes).strip("'\"")
                    imports.append({"module": module_name, "imported_symbol": None, "line_number": line_num})

        # 2. Exports
        elif node_type in ("export_statement", "export_declaration"):
            decl_node = node.child_by_field_name("declaration")
            if decl_node:
                name = self._get_declaration_name(decl_node, code_bytes)
                if name:
                    exports.append({"name": name, "line_number": line_num})
            else:
                # export { a, b }
                value_text = self._node_text(node, code_bytes)
                exports.append({"name": value_text, "line_number": line_num})

        # 3. Class Declarations
        elif node_type in ("class_declaration", "class"):
            name_node = node.child_by_field_name("name")
            class_name = self._node_text(name_node, code_bytes) if name_node else "AnonymousClass"
            symbols.append({"name": class_name, "type": "class", "line_number": line_num})

        # 4. Function Declarations & Arrow Functions
        elif node_type in ("function_declaration", "generator_function_declaration"):
            name_node = node.child_by_field_name("name")
            func_name = self._node_text(name_node, code_bytes) if name_node else "anonymous"
            sym_type = "component" if func_name and func_name[0].isupper() else "function"
            symbols.append({"name": func_name, "type": sym_type, "line_number": line_num})

        elif node_type in ("lexical_declaration", "variable_declaration"):
            for child in node.children:
                if child.type == "variable_declarator":
                    name_node = child.child_by_field_name("name")
                    value_node = child.child_by_field_name("value")
                    var_name = self._node_text(name_node, code_bytes) if name_node else None

                    if var_name:
                        if value_node and value_node.type in ("arrow_function", "function", "function_expression"):
                            sym_type = "component" if var_name[0].isupper() else "function"
                            symbols.append({"name": var_name, "type": sym_type, "line_number": line_num})
                        else:
                            symbols.append({"name": var_name, "type": "variable", "line_number": line_num})

        # Recurse children
        for child in node.children:
            # Skip recursing inside nested function bodies to avoid duplicate variable symbol noise if desired,
            # or recurse all top-level statements
            if child.type not in ("statement_block", "class_body"):
                self._traverse_node(child, code_bytes, symbols, imports, exports)
            else:
                # Walk methods inside class body
                if child.type == "class_body":
                    for method in child.children:
                        if method.type in ("method_definition", "public_field_definition"):
                            m_name_node = method.child_by_field_name("name")
                            if m_name_node:
                                m_name = self._node_text(m_name_node, code_bytes)
                                m_line = method.start_point[0] + 1
                                symbols.append({"name": m_name, "type": "function", "line_number": m_line})

    def _node_text(self, node: Any, code_bytes: bytes) -> str:
        if not node:
            return ""
        return code_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")

    def _get_declaration_name(self, decl_node: Any, code_bytes: bytes) -> Optional[str]:
        name_node = decl_node.child_by_field_name("name")
        if name_node:
            return self._node_text(name_node, code_bytes)
        for child in decl_node.children:
            if child.type == "variable_declarator":
                v_name = child.child_by_field_name("name")
                if v_name:
                    return self._node_text(v_name, code_bytes)
        return None
