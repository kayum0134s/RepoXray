from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.repository import RepositoryModel
from app.models.file import FileModel
from app.models.relationship import RelationshipModel
from app.services.graph_service import GraphService

class ArchitectureService:
    """Service computing high-level architectural metrics, hotspot analysis, and layer classifications."""

    def analyze_architecture(self, repo_id: str, db: Session) -> Dict[str, Any]:
        repo = db.query(RepositoryModel).filter(RepositoryModel.id == repo_id).first()
        if not repo:
            return {"error": f"Repository '{repo_id}' not found."}

        files = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
        relationships = db.query(RelationshipModel).filter(RelationshipModel.repository_id == repo_id).all()

        file_count = len(files)
        edge_count = len(relationships)

        # Count folders
        folder_set = set()
        lang_dict: Dict[str, int] = {}
        for f in files:
            lang = f.language or "Unknown"
            lang_dict[lang] = lang_dict.get(lang, 0) + 1
            parts = f.path.split("/")
            if len(parts) > 1:
                for i in range(1, len(parts)):
                    folder_set.add("/".join(parts[:i]))

        folder_count = len(folder_set)
        node_count = file_count

        # Compute degree connections per file
        degree_map: Dict[str, int] = {f.id: 0 for f in files}
        file_by_id = {f.id: f for f in files}

        for rel in relationships:
            if rel.source_id in degree_map:
                degree_map[rel.source_id] += 1
            if rel.target_id in degree_map:
                degree_map[rel.target_id] += 1

        # Hotspots (top connected files) with neutral technical descriptions
        sorted_files = sorted(files, key=lambda f: degree_map.get(f.id, 0), reverse=True)
        hotspots = []
        for f in sorted_files[:10]:
            conns = degree_map.get(f.id, 0)
            if conns > 0:
                # Neutral technical role description
                role = "Central Application Module"
                path_lower = f.path.lower()
                if any(k in path_lower for k in ["index", "main", "app"]):
                    role = "Primary Application Entrypoint / Root Module"
                elif any(k in path_lower for k in ["api", "router", "service"]):
                    role = "Central API Dispatcher & Service Coordinator"
                elif any(k in path_lower for k in ["util", "helper", "common"]):
                    role = "Shared Utility & Helper Library"
                elif any(k in path_lower for k in ["db", "model", "schema"]):
                    role = "Core Data Persistence Interface"

                hotspots.append({
                    "id": f.id,
                    "path": f.path,
                    "label": f.name,
                    "connections": conns,
                    "role_description": role
                })

        # Detect circular dependencies
        graph_service = GraphService()
        graph_data = graph_service.get_graph_for_repository(repo_id, db)
        if isinstance(graph_data, dict):
            cycles = graph_data.get("cycles", [])
        else:
            cycles = getattr(graph_data, "cycles", None) or []

        # Architecture Layer Classification & Confidence Scoring
        classified_count = 0
        layers: Dict[str, List[str]] = {
            "Frontend": [],
            "API": [],
            "Services": [],
            "Database": [],
            "Infrastructure": []
        }

        for f in files:
            path_lower = f.path.lower()
            if any(k in path_lower for k in ["component", "ui", "view", "page", "frontend", "style", "css", "html", "tsx", "jsx"]):
                layers["Frontend"].append(f.path)
                classified_count += 1
            elif any(k in path_lower for k in ["api", "controller", "route", "endpoint"]):
                layers["API"].append(f.path)
                classified_count += 1
            elif any(k in path_lower for k in ["service", "logic", "handler", "manager", "worker", "service.py", "service.ts"]):
                layers["Services"].append(f.path)
                classified_count += 1
            elif any(k in path_lower for k in ["db", "database", "model", "schema", "entity", "migration"]):
                layers["Database"].append(f.path)
                classified_count += 1
            elif any(k in path_lower for k in ["config", "setup", "docker", "json", "yml", "yaml", "env", "gitignore"]):
                layers["Infrastructure"].append(f.path)
                classified_count += 1

        confidence_pct = int((classified_count / file_count * 100)) if file_count > 0 else 0
        if confidence_pct >= 75:
            confidence_level = "High"
        elif confidence_pct >= 40:
            confidence_level = "Medium"
        else:
            confidence_level = "Low"

        return {
            "repository_id": repo_id,
            "overview": {
                "repository_name": repo.name,
                "owner": repo.owner,
                "branch": repo.default_branch,
                "languages": lang_dict,
                "file_count": file_count,
                "folder_count": folder_count,
                "dependency_count": edge_count,
                "node_count": node_count,
                "edge_count": edge_count,
            },
            "hotspots": hotspots,
            "cycles": cycles,
            "architecture_inference": {
                "confidence_level": confidence_level,
                "confidence_percentage": confidence_pct,
                "confidence_reason": f"{confidence_pct}% of source code paths matched evidence rules.",
                "layers": {
                    name: {"file_count": len(paths), "paths": paths[:15]}
                    for name, paths in layers.items()
                }
            }
        }
