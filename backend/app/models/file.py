from sqlalchemy import Column, String, Integer, ForeignKey
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from app.database.database import Base

class FileModel(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    path = Column(String, nullable=False)
    name = Column(String, nullable=False)
    extension = Column(String, nullable=True)
    language = Column(String, nullable=True)
    size_bytes = Column(Integer, default=0)
    line_count = Column(Integer, default=0)

class FileResponse(BaseModel):
    id: str
    repository_id: str
    path: str
    name: str
    extension: Optional[str] = None
    language: Optional[str] = None
    size_bytes: int
    line_count: int

    model_config = ConfigDict(from_attributes=True)

class FileDetailResponse(BaseModel):
    file: FileResponse
    symbols: List[Dict[str, Any]] = []
    incoming_relationships: List[Dict[str, Any]] = []
    outgoing_relationships: List[Dict[str, Any]] = []
    unresolved_imports: List[str] = []

    model_config = ConfigDict(from_attributes=True)

