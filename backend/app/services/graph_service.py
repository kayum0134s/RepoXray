import os
import posixpath
import json
import uuid
from typing import List, Dict, Any, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.models.relationship import GraphNode, GraphEdge, GraphMetrics, GraphDataResponse, RelationshipModel
from app.models.file import FileModel
from app.parsers.python_parser import PythonParser
from app.parsers.javascript_parser import JavaScriptParser
from app.parsers.typescript_parser import TypeScriptParser
from app.services.parser_service import ParserService
from app.utils.logger import logger

class GraphService:
    """
    Graph Engine responsible for:
    - Building normalized GraphNode and GraphEdge payloads from real AST source code evidence.
    - Multi-language import resolution (relative, aliases, extensions, index/init files).
    - Preventing fake/unresolved import relationships.
    - Graph metrics calculation (degree, connectivity, top connected files, largest files).
    - Cycle detection (A -> B -> C -> A).
    - Database persistence in SQLite relationships table.
    """

    EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".py", ".pyi", ".d.ts"]
    INDEX_FILES = ["index.ts", "index.tsx", "index.js", "index.jsx", "index.json", "__init__.py"]

    def __init__(self, alias_map: Optional[Dict[str, str]] = None):
        self.alias_map = alias_map or {"@/": "", "~": ""}
        self.parser_service = ParserService()

    def resolve_import_path(
        self,
        source_path: str,
        module_specifier: str,
        known_files: Set[str]
    ) -> Optional[str]:
        """
        Resolve an imported module specifier from `source_path` to an actual relative file path in `known_files`.
        Returns resolved relative file path if found in `known_files`, otherwise None (unresolved external package).
        """
        if not module_specifier or not module_specifier.strip():
            return None

        specifier = module_specifier.strip().replace("\\", "/")
        norm_source = source_path.replace("\\", "/")
        source_dir = posixpath.dirname(norm_source)

        # 1. Check relative imports (./foo, ../bar)
        if specifier.startswith("./") or specifier.startswith("../"):
            candidate_base = posixpath.normpath(posixpath.join(source_dir, specifier))
            resolved = self._match_candidate(candidate_base, known_files)
            if resolved:
                return resolved

        # 2. Check alias imports (@/components/Button, ~/utils/api)
        for alias_prefix, replacement in self.alias_map.items():
            if specifier.startswith(alias_prefix):
                stripped = specifier[len(alias_prefix):]
                # Common root candidate prefixes
                root_prefixes = ["", "src/", "app/", "frontend/", "backend/", "frontend/src/", "frontend/app/", "backend/app/"]
                for prefix in root_prefixes:
                    candidate_base = posixpath.normpath(posixpath.join(prefix, stripped))
                    resolved = self._match_candidate(candidate_base, known_files)
                    if resolved:
                        return resolved

        # 3. Check Python relative imports (.auth, ..services)
        if specifier.startswith("."):
            dots_count = len(specifier) - len(specifier.lstrip("."))
            stripped_module = specifier.lstrip(".")
            dir_parts = [p for p in source_dir.split("/") if p]

            if dots_count <= len(dir_parts):
                base_dir = "/".join(dir_parts[:len(dir_parts) - dots_count + 1]) if dots_count > 1 else source_dir
            else:
                base_dir = ""

            mod_as_path = stripped_module.replace(".", "/")
            candidate_base = posixpath.normpath(posixpath.join(base_dir, mod_as_path)) if mod_as_path else base_dir
            resolved = self._match_candidate(candidate_base, known_files)
            if resolved:
                return resolved

        # 4. Check Python package / absolute imports (app.services.api -> app/services/api)
        mod_as_path = specifier.replace(".", "/")
        source_parent_roots = []
        parts = [p for p in source_dir.split("/") if p]
        for i in range(len(parts), -1, -1):
            source_parent_roots.append("/".join(parts[:i]))

        search_roots = list(dict.fromkeys(["", "src", "app", "frontend", "backend", "backend/app", "frontend/src", "frontend/app"] + source_parent_roots))
        for root in search_roots:
            candidate_base = posixpath.normpath(posixpath.join(root, mod_as_path)) if root else mod_as_path
            resolved = self._match_candidate(candidate_base, known_files)
            if resolved:
                return resolved

        # 5. Exact match fallback (if specifier already contains exact known file path)
        if specifier in known_files:
            return specifier

        return None

    def _match_candidate(self, candidate_base: str, known_files: Set[str]) -> Optional[str]:
        """Try candidate path with extension variations and index/init files."""
        clean_base = posixpath.normpath(candidate_base)
        if clean_base.startswith("./"):
            clean_base = clean_base[2:]

        # Direct file + extensions
        for ext in self.EXTENSIONS:
            target = clean_base + ext if ext else clean_base
            if target in known_files:
                return target

        # Index / __init__ files
        for idx in self.INDEX_FILES:
            target = posixpath.join(clean_base, idx)
            if target in known_files:
                return target

        return None

    def build_nodes(self, files: List[Dict[str, Any]]) -> List[GraphNode]:
        """Build normalized GraphNode list from file records."""
        nodes: List[GraphNode] = []
        for f in files:
            file_path = f["path"].replace("\\", "/")
            file_name = f.get("name") or posixpath.basename(file_path)
            node_id = f.get("id") or file_path

            nodes.append(GraphNode(
                id=node_id,
                label=file_name,
                path=file_path,
                type="file",
                language=f.get("language"),
                metadata={
                    "size_bytes": f.get("size_bytes", 0),
                    "line_count": f.get("line_count", 0),
                    "in_degree": 0,
                    "out_degree": 0,
                    "total_degree": 0,
                    "unresolved_imports": []
                }
            ))
        return nodes

    def build_edges(
        self,
        file_imports_map: Dict[str, List[Dict[str, Any]]],
        known_files: Set[str],
        file_path_to_id: Dict[str, str]
    ) -> Tuple[List[GraphEdge], Dict[str, List[str]]]:
        """
        Resolve raw file imports into normalized GraphEdge objects.
        Deduplicates edges between same (source, target, type) while aggregating metadata evidence.
        Returns tuple of (GraphEdge list, unresolved_imports_per_file map).
        """
        raw_edges_map: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        unresolved_map: Dict[str, List[str]] = {}

        for source_path, import_list in file_imports_map.items():
            norm_source = source_path.replace("\\", "/")
            source_id = file_path_to_id.get(norm_source, norm_source)
            unresolved_map[norm_source] = []

            for imp in import_list:
                module_name = imp.get("module")
                if not module_name:
                    continue

                resolved_target = self.resolve_import_path(norm_source, module_name, known_files)

                if resolved_target and resolved_target != norm_source:
                    target_id = file_path_to_id.get(resolved_target, resolved_target)
                    edge_key = (source_id, target_id, "IMPORTS")

                    sym = imp.get("imported_symbol")
                    line_no = imp.get("line_number")
                    evidence_str = f"import {sym or module_name} from '{module_name}' (line {line_no})" if line_no else f"import '{module_name}'"

                    if edge_key not in raw_edges_map:
                        raw_edges_map[edge_key] = {
                            "id": f"{source_id}->{target_id}:IMPORTS",
                            "source": source_id,
                            "target": target_id,
                            "type": "IMPORTS",
                            "imported_symbols": [sym] if sym else [],
                            "line_numbers": [line_no] if line_no else [],
                            "raw_modules": [module_name],
                            "evidence": [evidence_str]
                        }
                    else:
                        edge_entry = raw_edges_map[edge_key]
                        if sym and sym not in edge_entry["imported_symbols"]:
                            edge_entry["imported_symbols"].append(sym)
                        if line_no and line_no not in edge_entry["line_numbers"]:
                            edge_entry["line_numbers"].append(line_no)
                        if module_name not in edge_entry["raw_modules"]:
                            edge_entry["raw_modules"].append(module_name)
                        if evidence_str not in edge_entry["evidence"]:
                            edge_entry["evidence"].append(evidence_str)
                else:
                    if not resolved_target:
                        if module_name not in unresolved_map[norm_source]:
                            unresolved_map[norm_source].append(module_name)

        edges: List[GraphEdge] = []
        for (src, tgt, etype), data in raw_edges_map.items():
            edges.append(GraphEdge(
                id=data["id"],
                source=data["source"],
                target=data["target"],
                type=data["type"],
                metadata={
                    "imported_symbols": data["imported_symbols"],
                    "line_numbers": data["line_numbers"],
                    "raw_modules": data["raw_modules"],
                    "evidence": data["evidence"],
                    "evidence_count": len(data["evidence"])
                }
            ))

        return edges, unresolved_map

    def detect_cycles(self, nodes: List[GraphNode], edges: List[GraphEdge]) -> List[List[str]]:
        """
        Detect directed cycles (A -> B -> C -> A) using Depth First Search (DFS).
        Returns list of cycles, where each cycle is represented by node paths forming a closed loop.
        """
        node_id_to_path = {n.id: n.path for n in nodes}
        adj: Dict[str, List[str]] = {n.path: [] for n in nodes}

        for edge in edges:
            src_path = node_id_to_path.get(edge.source, edge.source)
            tgt_path = node_id_to_path.get(edge.target, edge.target)
            if src_path in adj and tgt_path in adj:
                adj[src_path].append(tgt_path)

        detected_cycles: List[List[str]] = []
        visited: Set[str] = set()
        rec_stack: Set[str] = set()

        def dfs(curr: str, path: List[str]):
            visited.add(curr)
            rec_stack.add(curr)
            path.append(curr)

            for neighbor in adj.get(curr, []):
                if neighbor in rec_stack:
                    # Found cycle
                    cycle_start_idx = path.index(neighbor)
                    cycle = path[cycle_start_idx:] + [neighbor]
                    
                    # Canonicalize cycle (rotate to start with lexicographically smallest node path)
                    nodes_in_cycle = cycle[:-1]
                    min_idx = nodes_in_cycle.index(min(nodes_in_cycle))
                    canonical = nodes_in_cycle[min_idx:] + nodes_in_cycle[:min_idx] + [nodes_in_cycle[min_idx]]
                    
                    if canonical not in detected_cycles:
                        detected_cycles.append(canonical)
                elif neighbor not in visited:
                    dfs(neighbor, path)

            path.pop()
            rec_stack.remove(curr)

        for node_path in sorted(adj.keys()):
            if node_path not in visited:
                dfs(node_path, [])

        return detected_cycles

    def calculate_metrics(
        self,
        nodes: List[GraphNode],
        edges: List[GraphEdge],
        cycles: List[List[str]],
        unresolved_map: Dict[str, List[str]]
    ) -> GraphMetrics:
        """
        Calculate connectivity degree, most connected files, largest files, and summary metrics.
        Mutates node metadata to attach degree counts and unresolved import lists.
        """
        in_degree: Dict[str, int] = {n.id: 0 for n in nodes}
        out_degree: Dict[str, int] = {n.id: 0 for n in nodes}
        path_to_node = {n.path: n for n in nodes}

        for edge in edges:
            if edge.source in out_degree:
                out_degree[edge.source] += 1
            if edge.target in in_degree:
                in_degree[edge.target] += 1

        total_unresolved = 0
        for n in nodes:
            in_d = in_degree.get(n.id, 0)
            out_d = out_degree.get(n.id, 0)
            total_d = in_d + out_d

            unresolved_list = unresolved_map.get(n.path, [])
            total_unresolved += len(unresolved_list)

            n.metadata["in_degree"] = in_d
            n.metadata["out_degree"] = out_d
            n.metadata["total_degree"] = total_d
            n.metadata["unresolved_imports"] = unresolved_list

        # Calculate top metrics
        sorted_by_degree = sorted(nodes, key=lambda n: n.metadata.get("total_degree", 0), reverse=True)
        sorted_by_size = sorted(nodes, key=lambda n: n.metadata.get("line_count", 0), reverse=True)

        most_connected = [
            {
                "id": n.id,
                "path": n.path,
                "label": n.label,
                "total_degree": n.metadata["total_degree"],
                "in_degree": n.metadata["in_degree"],
                "out_degree": n.metadata["out_degree"]
            }
            for n in sorted_by_degree[:10]
        ]

        largest = [
            {
                "id": n.id,
                "path": n.path,
                "label": n.label,
                "line_count": n.metadata.get("line_count", 0),
                "size_bytes": n.metadata.get("size_bytes", 0)
            }
            for n in sorted_by_size[:10]
        ]

        max_deg = max((n.metadata.get("total_degree", 0) for n in nodes), default=0)

        return GraphMetrics(
            node_count=len(nodes),
            edge_count=len(edges),
            cycle_count=len(cycles),
            max_degree=max_deg,
            most_connected_files=most_connected,
            largest_files=largest,
            unresolved_import_count=total_unresolved
        )

    def build_graph(
        self,
        repo_id: str,
        files: List[Dict[str, Any]],
        file_imports_map: Optional[Dict[str, List[Dict[str, Any]]]] = None
    ) -> GraphDataResponse:
        """
        Build normalized graph from file records and file imports map.
        """
        nodes = self.build_nodes(files)
        known_files = {n.path for n in nodes}
        file_path_to_id = {n.path: n.id for n in nodes}

        imports_map = file_imports_map or {}
        edges, unresolved_map = self.build_edges(imports_map, known_files, file_path_to_id)
        cycles = self.detect_cycles(nodes, edges)
        metrics = self.calculate_metrics(nodes, edges, cycles, unresolved_map)

        return GraphDataResponse(
            repository_id=repo_id,
            nodes=nodes,
            edges=edges,
            cycles=cycles,
            metrics=metrics
        )

    def build_and_persist_graph(self, repo_id: str, db: Session) -> GraphDataResponse:
        """
        Fetch files from database, parse imports if necessary, build graph, calculate metrics & cycles,
        and persist relationships to SQLite DB.
        """
        file_models = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
        files_data = [
            {
                "id": f.id,
                "path": f.path,
                "name": f.name,
                "extension": f.extension,
                "language": f.language,
                "size_bytes": f.size_bytes,
                "line_count": f.line_count
            }
            for f in file_models
        ]

        nodes = self.build_nodes(files_data)
        known_files = {n.path for n in nodes}
        file_path_to_id = {n.path: n.id for n in nodes}

        # Parse source code for files to get imports if physical files exist or parser service can extract
        file_imports_map: Dict[str, List[Dict[str, Any]]] = {}

        for f in file_models:
            file_imports_map[f.path] = []
            # If physical local file exists (for local testing/repos), parse directly
            if os.path.exists(f.path) and os.path.isfile(f.path):
                try:
                    with open(f.path, "r", encoding="utf-8", errors="ignore") as fh:
                        code_content = fh.read()
                    parse_res = self.parser_service.parse_file(code_content, f.path)
                    file_imports_map[f.path] = parse_res.get("imports", [])
                except Exception as err:
                    logger.warning(f"Failed to read/parse local file '{f.path}': {err}")

        edges, unresolved_map = self.build_edges(file_imports_map, known_files, file_path_to_id)
        cycles = self.detect_cycles(nodes, edges)
        metrics = self.calculate_metrics(nodes, edges, cycles, unresolved_map)

        # Clear existing relationships for repo_id
        db.query(RelationshipModel).filter(RelationshipModel.repository_id == repo_id).delete()

        # Persist resolved relationships to database
        rel_models = []
        for edge in edges:
            rel_models.append(RelationshipModel(
                id=edge.id,
                repository_id=repo_id,
                source_id=edge.source,
                target_id=edge.target,
                type=edge.type,
                metadata_json=json.dumps(edge.metadata)
            ))

        if rel_models:
            db.bulk_save_objects(rel_models)
        db.commit()

        logger.info(f"Built & persisted graph for repository '{repo_id}': {len(nodes)} nodes, {len(edges)} edges, {len(cycles)} cycles.")

        return GraphDataResponse(
            repository_id=repo_id,
            nodes=nodes,
            edges=edges,
            cycles=cycles,
            metrics=metrics
        )

    def get_graph_for_repository(self, repo_id: str, db: Session) -> GraphDataResponse:
        """
        Retrieve complete resolved GraphDataResponse from SQLite database for a repository.
        Loads persisted nodes from `files` and edges from `relationships` table.
        """
        file_models = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
        files_data = [
            {
                "id": f.id,
                "path": f.path,
                "name": f.name,
                "extension": f.extension,
                "language": f.language,
                "size_bytes": f.size_bytes,
                "line_count": f.line_count
            }
            for f in file_models
        ]

        nodes = self.build_nodes(files_data)

        # Load persisted relationships from SQLite
        rel_models = db.query(RelationshipModel).filter(RelationshipModel.repository_id == repo_id).all()
        edges: List[GraphEdge] = []
        unresolved_map: Dict[str, List[str]] = {n.path: [] for n in nodes}

        for rel in rel_models:
            meta = json.loads(rel.metadata_json) if rel.metadata_json else {}
            edges.append(GraphEdge(
                id=rel.id,
                source=rel.source_id,
                target=rel.target_id,
                type=rel.type,
                metadata=meta
            ))

        cycles = self.detect_cycles(nodes, edges)
        metrics = self.calculate_metrics(nodes, edges, cycles, unresolved_map)

        return GraphDataResponse(
            repository_id=repo_id,
            nodes=nodes,
            edges=edges,
            cycles=cycles,
            metrics=metrics
        )


