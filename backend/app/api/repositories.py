import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.repository import RepositoryCreate, RepositoryResponse, DependencySummaryResponse
from app.models.file import FileModel, FileResponse, FileDetailResponse
from app.models.symbol import SymbolModel
from app.models.relationship import RelationshipModel, GraphDataResponse
from app.services.repository_service import RepositoryService
from app.services.github_service import GitHubService
from app.services.graph_service import GraphService

router = APIRouter(prefix="/api/repositories", tags=["Repositories"])

class AnalyzeRepositoryRequest(BaseModel):
    url: str

class AnalyzeRepositoryResponse(BaseModel):
    analysis_id: str
    repository_id: str
    status: str
    name: str
    owner: str
    url: str
    default_branch: str
    file_count: int
    message: str

@router.post("/analyze", response_model=AnalyzeRepositoryResponse, status_code=status.HTTP_201_CREATED)
async def analyze_repository(request: AnalyzeRepositoryRequest, db: Session = Depends(get_db)):
    """
    Ingest a public GitHub repository.
    Executes full backend pipeline: ingestion -> scanning -> AST parsing -> relationship resolution -> graph building -> persistence.
    """
    github_service = GitHubService()

    # 1. Validate URL and parse owner, repo, optional branch
    owner, repo, url_branch = github_service.parse_url(request.url)

    # 2. Fetch repository metadata from GitHub API
    meta = await github_service.fetch_repo_metadata(owner, repo)
    target_branch = url_branch or meta.get("default_branch", "main")

    # 3. Fetch full recursive git tree
    tree_items = await github_service.fetch_repo_tree(owner, repo, target_branch)

    # 4. Save & analyze repository via RepositoryService
    repo_service = RepositoryService(db)
    clean_url = f"https://github.com/{owner}/{repo}"
    db_repo, analysis_run = await repo_service.save_ingested_repository(
        owner=owner,
        name=repo,
        url=clean_url,
        default_branch=target_branch,
        metadata=meta,
        tree_items=tree_items,
        github_service=github_service
    )

    return AnalyzeRepositoryResponse(
        analysis_id=analysis_run.id,
        repository_id=db_repo.id,
        status=db_repo.status,
        name=db_repo.name,
        owner=db_repo.owner,
        url=db_repo.url,
        default_branch=db_repo.default_branch,
        file_count=db_repo.file_count,
        message=f"Repository analysis pipeline finished with status '{db_repo.status}'."
    )

@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
def create_repository(repo_in: RepositoryCreate, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    return service.create_repository(repo_in)

@router.get("", response_model=list[RepositoryResponse])
def list_repositories(limit: int = 50, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    return service.list_repositories(limit=limit)

@router.get("/{repo_id}", response_model=RepositoryResponse)
def get_repository(repo_id: str, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    repo = service.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
    return repo

@router.get("/{repo_id}/graph", response_model=GraphDataResponse)
def get_repository_graph(repo_id: str, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    repo = service.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
    graph_service = GraphService()
    return graph_service.get_graph_for_repository(repo_id, db)


@router.get("/{repo_id}/files", response_model=List[FileResponse])
def get_repository_files(repo_id: str, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    repo = service.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")
    files = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
    return files

@router.get("/{repo_id}/files/{file_id}", response_model=FileDetailResponse)
def get_file_detail(repo_id: str, file_id: str, db: Session = Depends(get_db)):
    file_model = db.query(FileModel).filter(
        FileModel.repository_id == repo_id,
        FileModel.id == file_id
    ).first()
    if not file_model:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found in repository '{repo_id}'.")

    # Fetch symbols
    symbols = db.query(SymbolModel).filter(
        SymbolModel.repository_id == repo_id,
        SymbolModel.file_id == file_id
    ).all()
    symbols_data = [{"name": s.name, "type": s.type, "line_number": s.line_number} for s in symbols]

    # Fetch relationships
    outgoing_rels = db.query(RelationshipModel).filter(
        RelationshipModel.repository_id == repo_id,
        RelationshipModel.source_id == file_id
    ).all()

    incoming_rels = db.query(RelationshipModel).filter(
        RelationshipModel.repository_id == repo_id,
        RelationshipModel.target_id == file_id
    ).all()

    def map_rel(rel):
        meta = json.loads(rel.metadata_json) if rel.metadata_json else {}
        return {
            "id": rel.id,
            "source": rel.source_id,
            "target": rel.target_id,
            "type": rel.type,
            "metadata": meta
        }

    return FileDetailResponse(
        file=FileResponse.model_validate(file_model),
        symbols=symbols_data,
        incoming_relationships=[map_rel(r) for r in incoming_rels],
        outgoing_relationships=[map_rel(r) for r in outgoing_rels],
        unresolved_imports=[]
    )

@router.get("/{repo_id}/dependencies", response_model=DependencySummaryResponse)
def get_repository_dependencies(repo_id: str, db: Session = Depends(get_db)):
    service = RepositoryService(db)
    repo = service.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail=f"Repository '{repo_id}' not found.")

    graph_service = GraphService()
    graph = graph_service.get_graph_for_repository(repo_id, db)

    metrics = graph.metrics

    unresolved_summary = []
    for node in graph.nodes:
        unresolved_list = node.metadata.get("unresolved_imports", [])
        if unresolved_list:
            unresolved_summary.append({
                "file_path": node.path,
                "unresolved_imports": unresolved_list
            })

    return DependencySummaryResponse(
        repository_id=repo_id,
        total_nodes=metrics.node_count if metrics else len(graph.nodes),
        total_edges=metrics.edge_count if metrics else len(graph.edges),
        total_cycles=metrics.cycle_count if metrics else len(graph.cycles),
        unresolved_import_count=metrics.unresolved_import_count if metrics else 0,
        unresolved_imports=unresolved_summary,
        top_dependencies=metrics.most_connected_files if metrics else [],
        cycles=graph.cycles
    )

