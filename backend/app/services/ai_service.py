import os
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.repository import RepositoryModel
from app.models.file import FileModel
from app.models.symbol import SymbolModel
from app.models.relationship import RelationshipModel
from app.services.architecture_service import ArchitectureService
from app.services.ai_providers import BaseAIProvider, OpenAIProvider, OllamaProvider, EvidenceFallbackProvider
from app.utils.logger import logger

SYSTEM_PROMPT = """You are RepoXray AI, an expert software architecture copilot.
You analyze GitHub repository structural evidence, AST symbol extractions, file paths, and dependency graphs.
CRITICAL RULE: NEVER invent fake files, symbols, or relationships. Rely ONLY on the provided repository evidence context.
Respond with clear, technical, concise markdown."""

class AIService:
    """Service providing evidence-grounded AI architectural analysis and impact inspection."""

    def get_provider(self) -> BaseAIProvider:

        """Resolve AI provider based on configuration and availability."""
        if os.getenv("OPENAI_API_KEY"):
            return OpenAIProvider()
        if os.getenv("OLLAMA_BASE_URL"):
            return OllamaProvider()
        return EvidenceFallbackProvider()

    async def explain_repository(self, repo_id: str, db: Session) -> Dict[str, Any]:
        arch_service = ArchitectureService()
        analysis = arch_service.analyze_architecture(repo_id, db)

        context = {
            "target": "repository",
            "repo_name": analysis.get("overview", {}).get("repository_name", repo_id),
            "file_count": analysis.get("overview", {}).get("file_count", 0),
            "hotspots": analysis.get("hotspots", []),
            "cycles": analysis.get("cycles", []),
            "languages": analysis.get("overview", {}).get("languages", {})
        }

        provider = self.get_provider()
        try:
            prompt = "Provide a high-level architectural overview of this repository based on file counts, hotspots, and component connections."
            answer = await provider.generate(prompt, SYSTEM_PROMPT, context)
        except Exception as exc:
            logger.warning(f"Primary AI provider failed ({exc}). Falling back to evidence provider.")
            answer = await EvidenceFallbackProvider().generate(prompt, SYSTEM_PROMPT, context)

        return {
            "repository_id": repo_id,
            "target": "repository",
            "answer": answer,
            "context_summary": context
        }

    async def explain_file(self, repo_id: str, file_path: str, db: Session) -> Dict[str, Any]:
        file_model = db.query(FileModel).filter(
            FileModel.repository_id == repo_id,
            FileModel.path == file_path
        ).first()

        if not file_model:
            return {"error": f"File '{file_path}' not found in repository '{repo_id}'."}

        symbols = db.query(SymbolModel).filter(
            SymbolModel.repository_id == repo_id,
            SymbolModel.file_id == file_model.id
        ).all()

        incoming_rels = db.query(RelationshipModel).filter(
            RelationshipModel.repository_id == repo_id,
            RelationshipModel.target_id == file_model.id
        ).all()

        outgoing_rels = db.query(RelationshipModel).filter(
            RelationshipModel.repository_id == repo_id,
            RelationshipModel.source_id == file_model.id
        ).all()

        file_info = {
            "path": file_model.path,
            "language": file_model.language,
            "line_count": file_model.line_count,
            "symbols": [{"name": s.name, "type": s.type} for s in symbols],
            "imported_by": [r.source_id for r in incoming_rels],
            "imports": [r.target_id for r in outgoing_rels]
        }

        context = {
            "target": "file",
            "selected_file": file_info
        }

        provider = self.get_provider()
        try:
            prompt = f"Explain the role, symbols, and dependencies of file '{file_path}'."
            answer = await provider.generate(prompt, SYSTEM_PROMPT, context)
        except Exception as exc:
            logger.warning(f"AI provider error: {exc}. Using evidence fallback.")
            answer = await EvidenceFallbackProvider().generate(prompt, SYSTEM_PROMPT, context)

        return {
            "repository_id": repo_id,
            "file_path": file_path,
            "answer": answer,
            "file_info": file_info
        }

    async def impact_analysis(self, repo_id: str, file_path: str, db: Session) -> Dict[str, Any]:
        file_model = db.query(FileModel).filter(
            FileModel.repository_id == repo_id,
            FileModel.path == file_path
        ).first()

        if not file_model:
            return {"error": f"File '{file_path}' not found."}

        incoming_rels = db.query(RelationshipModel).filter(
            RelationshipModel.repository_id == repo_id,
            RelationshipModel.target_id == file_model.id
        ).all()

        outgoing_rels = db.query(RelationshipModel).filter(
            RelationshipModel.repository_id == repo_id,
            RelationshipModel.source_id == file_model.id
        ).all()

        incoming_ids = [r.source_id for r in incoming_rels]
        dependent_files = db.query(FileModel).filter(FileModel.id.in_(incoming_ids)).all() if incoming_ids else []
        dependent_paths = [f.path for f in dependent_files]

        in_count = len(incoming_rels)
        out_count = len(outgoing_rels)

        if in_count >= 10:
            impact_level = "CRITICAL"
        elif in_count >= 4:
            impact_level = "HIGH"
        elif in_count >= 1:
            impact_level = "MEDIUM"
        else:
            impact_level = "LOW"

        impact_info = {
            "path": file_path,
            "incoming_count": in_count,
            "outgoing_count": out_count,
            "impact_level": impact_level,
            "dependents": dependent_paths
        }

        context = {
            "target": "impact",
            "impact_analysis": impact_info
        }

        provider = self.get_provider()
        try:
            prompt = f"Perform architectural impact analysis if '{file_path}' is modified."
            answer = await provider.generate(prompt, SYSTEM_PROMPT, context)
        except Exception as exc:
            logger.warning(f"AI provider error: {exc}. Using evidence fallback.")
            answer = await EvidenceFallbackProvider().generate(prompt, SYSTEM_PROMPT, context)

        return {
            "repository_id": repo_id,
            "file_path": file_path,
            "impact_level": impact_level,
            "answer": answer,
            "impact_info": impact_info
        }

    async def query(self, repo_id: str, query_str: str, db: Session) -> Dict[str, Any]:
        query_lower = query_str.lower()

        # Route specialized query types
        if "auth" in query_lower or "login" in query_lower:
            files = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
            paths = [f.path for f in files]
            context = {"target": "auth_flow", "files": paths}
            answer = await EvidenceFallbackProvider().generate(query_str, SYSTEM_PROMPT, context)
            return {"repository_id": repo_id, "query": query_str, "answer": answer}

        if "database" in query_lower or "model" in query_lower or "schema" in query_lower:
            files = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
            paths = [f.path for f in files]
            context = {"target": "db_flow", "files": paths}
            answer = await EvidenceFallbackProvider().generate(query_str, SYSTEM_PROMPT, context)
            return {"repository_id": repo_id, "query": query_str, "answer": answer}

        arch_service = ArchitectureService()
        analysis = arch_service.analyze_architecture(repo_id, db)
        context = {
            "repo_name": analysis.get("overview", {}).get("repository_name", repo_id),
            "file_count": analysis.get("overview", {}).get("file_count", 0),
            "hotspots": analysis.get("hotspots", []),
            "cycles": analysis.get("cycles", [])
        }

        provider = self.get_provider()
        try:
            answer = await provider.generate(query_str, SYSTEM_PROMPT, context)
        except Exception as exc:
            logger.warning(f"AI provider error: {exc}. Using evidence fallback.")
            answer = await EvidenceFallbackProvider().generate(query_str, SYSTEM_PROMPT, context)

        return {
            "repository_id": repo_id,
            "query": query_str,
            "answer": answer
        }
