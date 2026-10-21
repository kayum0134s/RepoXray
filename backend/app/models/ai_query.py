from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from pydantic import BaseModel, ConfigDict
from app.database.database import Base

class AiQueryModel(Base):
    __tablename__ = "ai_queries"

    id = Column(String, primary_key=True, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    model_used = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AiQueryCreate(BaseModel):
    repository_id: str
    prompt: str

class AiQueryResponse(BaseModel):
    id: str
    repository_id: str
    prompt: str
    response: str
    model_used: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
