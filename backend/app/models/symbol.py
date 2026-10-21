from sqlalchemy import Column, String, Integer, ForeignKey
from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.database.database import Base

class SymbolModel(Base):
    __tablename__ = "symbols"

    id = Column(String, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("files.id"), nullable=False, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # function, class, variable, import, export
    line_number = Column(Integer, nullable=True)

class SymbolResponse(BaseModel):
    id: str
    file_id: str
    repository_id: str
    name: str
    type: str
    line_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
