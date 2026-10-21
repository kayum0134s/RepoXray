import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.database import Base
from app.models.repository import RepositoryModel
from app.models.file import FileModel
from app.models.relationship import RelationshipModel
from app.services.architecture_service import ArchitectureService


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database session for architecture tests."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_analysis_handles_graph_model_cycles(db_session):
    """Architecture analysis must read cycles from GraphDataResponse, not a dict."""
    db_session.add(
        RepositoryModel(
            id="repo-arch-1",
            url="https://github.com/example/arch",
            name="arch",
            owner="example",
            default_branch="main",
            file_count=2,
        )
    )
    db_session.add_all(
        [
            FileModel(
                id="a1",
                repository_id="repo-arch-1",
                path="app/api/routes.py",
                name="routes.py",
                extension=".py",
                language="Python",
                size_bytes=120,
                line_count=20,
            ),
            FileModel(
                id="a2",
                repository_id="repo-arch-1",
                path="app/services/core.py",
                name="core.py",
                extension=".py",
                language="Python",
                size_bytes=90,
                line_count=16,
            ),
        ]
    )
    # Circular dependency: routes.py <-> core.py
    db_session.add_all(
        [
            RelationshipModel(
                id="r1",
                repository_id="repo-arch-1",
                source_id="a1",
                target_id="a2",
                type="IMPORTS",
                metadata_json=None,
            ),
            RelationshipModel(
                id="r2",
                repository_id="repo-arch-1",
                source_id="a2",
                target_id="a1",
                type="IMPORTS",
                metadata_json=None,
            ),
        ]
    )
    db_session.commit()

    result = ArchitectureService().analyze_architecture("repo-arch-1", db_session)

    assert "error" not in result
    assert isinstance(result["cycles"], list)
    assert len(result["cycles"]) == 1
    assert result["overview"]["file_count"] == 2
    assert result["overview"]["dependency_count"] == 2
    assert result["hotspots"][0]["connections"] == 2
    assert result["architecture_inference"]["confidence_level"] in {"High", "Medium", "Low"}
