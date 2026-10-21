from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.services.ai_service import AIService

router = APIRouter(prefix="/api", tags=["AI"])

class AIExplainRequest(BaseModel):
    target: str = "repository"  # 'repository' | 'file' | 'impact' | 'auth_flow' | 'db_flow'
    file_path: Optional[str] = None

class AIQueryRequest(BaseModel):
    repository_id: str
    query: str

@router.post("/repositories/{repo_id}/ai/explain")
async def explain_repository_endpoint(
    repo_id: str,
    request: AIExplainRequest,
    db: Session = Depends(get_db)
):
    service = AIService()
    if request.target == "file" and request.file_path:
        return await service.explain_file(repo_id, request.file_path, db)
    elif request.target == "impact" and request.file_path:
        return await service.impact_analysis(repo_id, request.file_path, db)
    else:
        return await service.explain_repository(repo_id, db)

@router.post("/repositories/{repo_id}/ai/query")
async def query_repository_ai_endpoint(
    repo_id: str,
    request: AIQueryRequest,
    db: Session = Depends(get_db)
):
    service = AIService()
    return await service.query(repo_id, request.query, db)

@router.post("/ai/query")
async def query_ai(
    request: AIQueryRequest,
    db: Session = Depends(get_db)
):
    service = AIService()
    return await service.query(request.repository_id, request.query, db)
