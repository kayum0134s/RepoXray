from sqlalchemy import Column, String, ForeignKey
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from app.database.database import Base

class RelationshipModel(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    target_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # IMPORTS, CALLS, RENDERS, etc.
    metadata_json = Column(String, nullable=True)

class GraphNode(BaseModel):
    id: str
    label: str
    path: str
    type: str  # file, module, package, class, function
    language: Optional[str] = None
    metadata: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # IMPORTS, CALLS, etc.
    metadata: Dict[str, Any] = {}

class GraphMetrics(BaseModel):
    node_count: int = 0
    edge_count: int = 0
    cycle_count: int = 0
    max_degree: int = 0
    most_connected_files: List[Dict[str, Any]] = []
    largest_files: List[Dict[str, Any]] = []
    unresolved_import_count: int = 0

class GraphDataResponse(BaseModel):
    repository_id: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    cycles: List[List[str]] = []
    metrics: Optional[GraphMetrics] = None

    model_config = ConfigDict(from_attributes=True)
