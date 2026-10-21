from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Integer, DateTime
from pydantic import BaseModel, ConfigDict
from app.database.database import Base

class RepositoryModel(Base):
    __tablename__ = "repositories"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    url = Column(String, nullable=False, unique=True)
    default_branch = Column(String, default="main")
    status = Column(String, default="pending")  # pending, scanning, parsing, resolving, building_graph, completed, failed
    file_count = Column(Integer, default=0)
    language_summary = Column(String, nullable=True) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RepositoryCreate(BaseModel):
    url: str

class RepositoryResponse(BaseModel):
    id: str
    name: str
    owner: str
    url: str
    default_branch: str
    status: str
    file_count: int
    language_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DependencySummaryResponse(BaseModel):
    repository_id: str
    total_nodes: int
    total_edges: int
    total_cycles: int
    unresolved_import_count: int
    unresolved_imports: List[Dict[str, Any]] = []
    top_dependencies: List[Dict[str, Any]] = []
    cycles: List[List[str]] = []

    model_config = ConfigDict(from_attributes=True)

