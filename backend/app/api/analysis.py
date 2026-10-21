from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.services.architecture_service import ArchitectureService

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])

@router.get("/{repo_id}")
def analyze_repository(repo_id: str, db: Session = Depends(get_db)):
    service = ArchitectureService()
    res = service.analyze_architecture(repo_id, db)
    if "error" in res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=res["error"])
    return res
