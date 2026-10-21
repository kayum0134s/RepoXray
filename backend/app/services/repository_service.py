import uuid
import os
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.repository import RepositoryModel, RepositoryCreate
from app.models.file import FileModel
from app.models.symbol import SymbolModel
from app.models.relationship import RelationshipModel
from app.models.analysis_run import AnalysisRunModel
from app.services.scanner_service import ScannerService
from app.services.parser_service import ParserService
from app.services.graph_service import GraphService
from app.services.github_service import GitHubService
from app.utils.logger import logger

class RepositoryService:
    """Service executing backend vertical slice: scan -> parse -> resolve -> graph -> persist."""

    def __init__(self, db: Session):
        self.db = db
        self.scanner = ScannerService()
        self.parser_service = ParserService()
        self.graph_service = GraphService()

    def get_repository_by_url(self, url: str) -> Optional[RepositoryModel]:
        return self.db.query(RepositoryModel).filter(RepositoryModel.url == url).first()

    def get_repository(self, repo_id: str) -> Optional[RepositoryModel]:
        return self.db.query(RepositoryModel).filter(RepositoryModel.id == repo_id).first()

    def list_repositories(self, limit: int = 50) -> List[RepositoryModel]:
        return self.db.query(RepositoryModel).limit(limit).all()

    def create_repository(self, repo_create: RepositoryCreate) -> RepositoryModel:
        repo_id = str(uuid.uuid4())
        db_repo = RepositoryModel(
            id=repo_id,
            url=repo_create.url,
            name=os.path.basename(repo_create.url.rstrip("/")),
            owner="unknown",
            status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(db_repo)
        self.db.commit()
        self.db.refresh(db_repo)
        return db_repo

    async def save_ingested_repository(
        self,
        owner: str,
        name: str,
        url: str,
        default_branch: str,
        metadata: Dict[str, Any],
        tree_items: List[Dict[str, Any]],
        github_service: Optional[GitHubService] = None
    ) -> Tuple[RepositoryModel, AnalysisRunModel]:
        """
        Executes end-to-end backend vertical slice:
        1. Ingestion & Scanning (scanning status)
        2. File inventory persistence
        3. AST Source code parsing & symbol extraction (parsing status)
        4. Relationship resolution & graph generation (resolving -> building_graph status)
        5. SQLite persistence & completion (completed status)
        """
        # Step 1: Initialize Repository record (Status: scanning)
        existing_repo = self.get_repository_by_url(url)
        if existing_repo:
            db_repo = existing_repo
            db_repo.name = name
            db_repo.owner = owner
            db_repo.default_branch = default_branch
            db_repo.status = "scanning"
            db_repo.updated_at = datetime.utcnow()
        else:
            repo_id = str(uuid.uuid4())
            db_repo = RepositoryModel(
                id=repo_id,
                url=url,
                name=name,
                owner=owner,
                default_branch=default_branch,
                status="scanning",
                file_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(db_repo)

        self.db.commit()
        self.db.refresh(db_repo)

        try:
            # Step 2: Repository Scanning (filter ignores, detect languages)
            scanned_files = self.scanner.scan_git_tree(tree_items)

            # Clear previous files, symbols, relationships for clean re-ingestion
            self.db.query(RelationshipModel).filter(RelationshipModel.repository_id == db_repo.id).delete()
            self.db.query(SymbolModel).filter(SymbolModel.repository_id == db_repo.id).delete()
            self.db.query(FileModel).filter(FileModel.repository_id == db_repo.id).delete()
            self.db.commit()

            file_models = []
            lang_counts: Dict[str, int] = {}
            path_to_file_id: Dict[str, str] = {}
            code_contents_map: Dict[str, str] = {}

            for sf in scanned_files:
                language = sf["language"]
                lang_counts[language] = lang_counts.get(language, 0) + 1

                file_id = str(uuid.uuid4())
                path_to_file_id[sf["path"]] = file_id

                file_model = FileModel(
                    id=file_id,
                    repository_id=db_repo.id,
                    path=sf["path"],
                    name=sf["name"],
                    extension=sf["extension"] if sf["extension"] else None,
                    language=language,
                    size_bytes=sf["size_bytes"],
                    line_count=sf["line_count"]
                )
                file_models.append(file_model)

            if file_models:
                self.db.bulk_save_objects(file_models)
                self.db.commit()

            db_repo.file_count = len(scanned_files)
            db_repo.language_summary = json.dumps(lang_counts)

            # Step 3: Source Code Parsing (Status: parsing)
            db_repo.status = "parsing"
            self.db.commit()

            code_files = [
                sf for sf in scanned_files
                if sf["language"] in ("Python", "JavaScript", "TypeScript", "TSX", "JSX", "JSON")
            ]

            # Fetch file contents for parsing (local disk or GitHub API)
            sem = asyncio.Semaphore(10)
            gh_service = github_service or GitHubService()

            async def fetch_one(sf):
                path = sf["path"]
                if os.path.exists(path) and os.path.isfile(path):
                    try:
                        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                            return path, fh.read()
                    except Exception:
                        pass
                if gh_service:
                    async with sem:
                        content = await gh_service.fetch_file_content(owner, name, path, default_branch)
                        return path, content
                return path, ""

            tasks = [fetch_one(sf) for sf in code_files[:100]]  # Parse up to top 100 source files
            fetched_results = await asyncio.gather(*tasks, return_exceptions=True)

            file_imports_map: Dict[str, List[Dict[str, Any]]] = {}
            total_symbols_extracted = 0

            for res in fetched_results:
                if isinstance(res, tuple) and len(res) == 2:
                    filepath, code_content = res
                    if code_content and code_content.strip():
                        code_contents_map[filepath] = code_content
                        parse_res = self.parser_service.parse_file(code_content, filepath)
                        file_imports_map[filepath] = parse_res.get("imports", [])

                        # Persist symbols
                        file_id = path_to_file_id.get(filepath)
                        if file_id:
                            symbols_data = parse_res.get("symbols", [])
                            symbol_models = [
                                SymbolModel(
                                    id=str(uuid.uuid4()),
                                    file_id=file_id,
                                    repository_id=db_repo.id,
                                    name=s["name"],
                                    type=s["type"],
                                    line_number=s.get("line_number")
                                )
                                for s in symbols_data
                            ]
                            if symbol_models:
                                self.db.bulk_save_objects(symbol_models)
                                total_symbols_extracted += len(symbol_models)

            self.db.commit()

            # Step 4: Relationship Resolution & Graph Generation (Status: resolving -> building_graph)
            db_repo.status = "resolving"
            self.db.commit()

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

            db_repo.status = "building_graph"
            self.db.commit()

            graph_response = self.graph_service.build_graph(db_repo.id, files_data, file_imports_map)

            # Persist resolved relationship edges to SQLite
            rel_models = [
                RelationshipModel(
                    id=edge.id,
                    repository_id=db_repo.id,
                    source_id=edge.source,
                    target_id=edge.target,
                    type=edge.type,
                    metadata_json=json.dumps(edge.metadata)
                )
                for edge in graph_response.edges
            ]
            if rel_models:
                self.db.bulk_save_objects(rel_models)

            # Step 5: Completion (Status: completed)
            db_repo.status = "completed"
            db_repo.updated_at = datetime.utcnow()

            analysis_id = str(uuid.uuid4())
            metrics = graph_response.metrics
            summary_msg = (
                f"Ingested '{owner}/{name}'@{default_branch}. "
                f"Scanned {len(scanned_files)} files across {len(lang_counts)} languages. "
                f"Extracted {total_symbols_extracted} symbols and resolved {len(graph_response.edges)} edges "
                f"with {len(graph_response.cycles)} cycles."
            )

            analysis_run = AnalysisRunModel(
                id=analysis_id,
                repository_id=db_repo.id,
                status="completed",
                summary=summary_msg,
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            self.db.add(analysis_run)
            self.db.commit()

            self.db.refresh(db_repo)
            self.db.refresh(analysis_run)

            logger.info(f"Complete backend slice succeeded for '{owner}/{name}': {summary_msg}")
            return db_repo, analysis_run

        except Exception as err:
            logger.error(f"Pipeline error analyzing '{owner}/{name}': {err}", exc_info=True)
            db_repo.status = "failed"
            self.db.commit()

            analysis_id = str(uuid.uuid4())
            analysis_run = AnalysisRunModel(
                id=analysis_id,
                repository_id=db_repo.id,
                status="failed",
                summary=f"Analysis failed: {str(err)}",
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            self.db.add(analysis_run)
            self.db.commit()

            self.db.refresh(db_repo)
            self.db.refresh(analysis_run)
            return db_repo, analysis_run

