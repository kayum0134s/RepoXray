import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.file import FileModel, FileResponse, FileDetailResponse
from app.models.symbol import SymbolModel
from app.models.relationship import RelationshipModel
from app.models.repository import RepositoryModel
from app.services.github_service import GitHubService

router = APIRouter(prefix="/api/files", tags=["Files"])

@router.get("/{repo_id}", response_model=List[FileResponse])
def list_repository_files(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(RepositoryModel).filter(RepositoryModel.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Repository '{repo_id}' not found.")
    files = db.query(FileModel).filter(FileModel.repository_id == repo_id).all()
    return files

@router.get("/{repo_id}/{file_id}", response_model=FileDetailResponse)
def get_file_detail(repo_id: str, file_id: str, db: Session = Depends(get_db)):
    file_model = db.query(FileModel).filter(
        FileModel.repository_id == repo_id,
        FileModel.id == file_id
    ).first()
    if not file_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File '{file_id}' not found.")

    symbols = db.query(SymbolModel).filter(
        SymbolModel.repository_id == repo_id,
        SymbolModel.file_id == file_id
    ).all()
    symbols_data = [{"name": s.name, "type": s.type, "line_number": s.line_number} for s in symbols]

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

@router.get("/{repo_id}/{file_id}/content")
async def get_file_content_endpoint(repo_id: str, file_id: str, db: Session = Depends(get_db)):
    repo = db.query(RepositoryModel).filter(RepositoryModel.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Repository '{repo_id}' not found.")
    file_model = db.query(FileModel).filter(
        FileModel.repository_id == repo_id,
        FileModel.id == file_id
    ).first()
    if not file_model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File '{file_id}' not found.")

    github_service = GitHubService()
    content = await github_service.fetch_file_content(repo.owner, repo.name, file_model.path, repo.default_branch)

    lines = content.splitlines()
    truncated = False
    if len(lines) > 2000:
        lines = lines[:2000]
        content = "\n".join(lines) + "\n\n# --- TRUNCATED: File exceeds 2000 lines ---"
        truncated = True

    return {
        "repository_id": repo_id,
        "file_id": file_id,
        "path": file_model.path,
        "language": file_model.language,
        "line_count": file_model.line_count,
        "size_bytes": file_model.size_bytes,
        "content": content,
        "truncated": truncated
    }
