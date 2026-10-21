from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.relationship import GraphDataResponse
from app.models.repository import RepositoryModel
from app.services.graph_service import GraphService

router = APIRouter(prefix="/api/graph", tags=["Graph"])

@router.get("/{repo_id}", response_model=GraphDataResponse)
def get_repository_graph(repo_id: str, db: Session = Depends(get_db)):
    repo = db.query(RepositoryModel).filter(RepositoryModel.id == repo_id).first()
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository '{repo_id}' not found."
        )

    graph_service = GraphService()
    return graph_service.get_graph_for_repository(repo_id, db)


