from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from pydantic import BaseModel, ConfigDict
from app.database.database import Base

class AnalysisRunModel(Base):
    __tablename__ = "analysis_runs"

    id = Column(String, primary_key=True, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, running, completed, failed
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class AnalysisRunCreate(BaseModel):
    repository_id: str

class AnalysisRunResponse(BaseModel):
    id: str
    repository_id: str
    status: str
    summary: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
