import pytest
from app.services.graph_service import GraphService
from app.models.relationship import GraphNode, GraphEdge, GraphDataResponse, RelationshipModel
from app.models.file import FileModel
from app.models.repository import RepositoryModel
from app.database.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    """Create an in-memory SQLite database session for unit testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_relative_import_resolution():
    service = GraphService()
    known_files = {
        "src/components/Header.tsx",
        "src/components/Button.tsx",
        "src/utils/file_utils.ts",
        "src/services/index.ts"
    }

    # Relative same dir
    res1 = service.resolve_import_path("src/components/Header.tsx", "./Button", known_files)
    assert res1 == "src/components/Button.tsx"

    # Relative parent dir
    res2 = service.resolve_import_path("src/components/Header.tsx", "../utils/file_utils", known_files)
    assert res2 == "src/utils/file_utils.ts"

    # Relative index file
    res3 = service.resolve_import_path("src/components/Header.tsx", "../services", known_files)
    assert res3 == "src/services/index.ts"

def test_alias_import_resolution():
    service = GraphService(alias_map={"@/": "", "~": ""})
    known_files = {
        "frontend/components/Button.tsx",
        "frontend/lib/api.ts",
        "src/components/Card.tsx"
    }

    res1 = service.resolve_import_path("frontend/app/page.tsx", "@/components/Button", known_files)
    assert res1 == "frontend/components/Button.tsx"

    res2 = service.resolve_import_path("frontend/app/page.tsx", "@/lib/api", known_files)
    assert res2 == "frontend/lib/api.ts"

def test_python_import_resolution():
    service = GraphService()
    known_files = {
        "backend/app/main.py",
        "backend/app/services/api.py",
        "backend/app/models/file.py",
        "backend/app/api/__init__.py",
        "backend/app/api/users.py",
        "backend/app/api/auth.py"
    }

    # Python absolute module import
    res1 = service.resolve_import_path("backend/app/main.py", "app.services.api", known_files)
    assert res1 == "backend/app/services/api.py"

    # Python relative import
    res2 = service.resolve_import_path("backend/app/api/users.py", ".auth", known_files)
    assert res2 == "backend/app/api/auth.py"

def test_unresolved_external_imports():
    service = GraphService()
    known_files = {
        "app/main.py",
        "src/app.tsx"
    }

    # External python package & stdlib
    assert service.resolve_import_path("app/main.py", "fastapi", known_files) is None
    assert service.resolve_import_path("app/main.py", "sqlalchemy", known_files) is None
    assert service.resolve_import_path("app/main.py", "os", known_files) is None

    # External JS package
    assert service.resolve_import_path("src/app.tsx", "react", known_files) is None
    assert service.resolve_import_path("src/app.tsx", "lucide-react", known_files) is None

def test_duplicate_relationship_deduplication():
    service = GraphService()
    files = [
        {"path": "src/app.ts", "name": "app.ts", "size_bytes": 100, "line_count": 20},
        {"path": "src/utils.ts", "name": "utils.ts", "size_bytes": 50, "line_count": 10}
    ]
    file_imports_map = {
        "src/app.ts": [
            {"module": "./utils", "imported_symbol": "foo", "line_number": 2},
            {"module": "./utils", "imported_symbol": "bar", "line_number": 5}
        ]
    }

    graph = service.build_graph("repo-1", files, file_imports_map)
    assert len(graph.nodes) == 2
    assert len(graph.edges) == 1  # Deduplicated into 1 edge

    edge = graph.edges[0]
    assert edge.source == "src/app.ts"
    assert edge.target == "src/utils.ts"
    assert edge.type == "IMPORTS"
    assert "foo" in edge.metadata["imported_symbols"]
    assert "bar" in edge.metadata["imported_symbols"]
    assert edge.metadata["line_numbers"] == [2, 5]
    assert edge.metadata["evidence_count"] == 2

def test_cycle_detection():
    service = GraphService()
    nodes = [
        GraphNode(id="A", label="A.py", path="A.py", type="file"),
        GraphNode(id="B", label="B.py", path="B.py", type="file"),
        GraphNode(id="C", label="C.py", path="C.py", type="file"),
        GraphNode(id="D", label="D.py", path="D.py", type="file"),
    ]
    # Cycle: A -> B -> C -> A
    edges = [
        GraphEdge(id="e1", source="A", target="B", type="IMPORTS"),
        GraphEdge(id="e2", source="B", target="C", type="IMPORTS"),
        GraphEdge(id="e3", source="C", target="A", type="IMPORTS"),
        GraphEdge(id="e4", source="C", target="D", type="IMPORTS"),
    ]

    cycles = service.detect_cycles(nodes, edges)
    assert len(cycles) == 1
    assert sorted(cycles[0]) == sorted(["A.py", "B.py", "C.py", "A.py"])

def test_graph_metrics_calculation():
    service = GraphService()
    files = [
        {"path": "src/main.ts", "name": "main.ts", "size_bytes": 1000, "line_count": 100},
        {"path": "src/api.ts", "name": "api.ts", "size_bytes": 500, "line_count": 50},
        {"path": "src/utils.ts", "name": "utils.ts", "size_bytes": 200, "line_count": 20}
    ]
    file_imports_map = {
        "src/main.ts": [
            {"module": "./api", "imported_symbol": "getApi", "line_number": 1},
            {"module": "./utils", "imported_symbol": "formatDate", "line_number": 2},
            {"module": "react", "imported_symbol": "useState", "line_number": 3}
        ],
        "src/api.ts": [
            {"module": "./utils", "imported_symbol": "formatDate", "line_number": 1}
        ]
    }

    graph = service.build_graph("repo-metrics", files, file_imports_map)

    assert graph.metrics is not None
    assert graph.metrics.node_count == 3
    assert graph.metrics.edge_count == 3
    assert graph.metrics.unresolved_import_count == 1  # react

    # Check degrees on node metadata
    main_node = next(n for n in graph.nodes if n.path == "src/main.ts")
    assert main_node.metadata["out_degree"] == 2
    assert main_node.metadata["in_degree"] == 0
    assert main_node.metadata["total_degree"] == 2
    assert main_node.metadata["unresolved_imports"] == ["react"]

    utils_node = next(n for n in graph.nodes if n.path == "src/utils.ts")
    assert utils_node.metadata["in_degree"] == 2
    assert utils_node.metadata["total_degree"] == 2

    # Most connected & largest files
    assert graph.metrics.most_connected_files[0]["path"] in ("src/main.ts", "src/utils.ts")
    assert graph.metrics.largest_files[0]["path"] == "src/main.ts"

def test_database_persistence(db_session):
    repo = RepositoryModel(
        id="repo-db-1",
        url="https://github.com/example/test",
        name="test",
        owner="example",
        default_branch="main"
    )
    f1 = FileModel(
        id="f1",
        repository_id="repo-db-1",
        path="src/index.ts",
        name="index.ts",
        extension=".ts",
        language="TypeScript",
        size_bytes=100,
        line_count=15
    )
    f2 = FileModel(
        id="f2",
        repository_id="repo-db-1",
        path="src/helper.ts",
        name="helper.ts",
        extension=".ts",
        language="TypeScript",
        size_bytes=50,
        line_count=8
    )
    db_session.add(repo)
    db_session.add(f1)
    db_session.add(f2)
    db_session.commit()

    graph_service = GraphService()
    graph_response = graph_service.build_and_persist_graph("repo-db-1", db_session)

    assert graph_response.repository_id == "repo-db-1"
    assert len(graph_response.nodes) == 2

    # Query SQLite database for saved relationships
    saved_rels = db_session.query(RelationshipModel).filter(RelationshipModel.repository_id == "repo-db-1").all()
    assert len(saved_rels) == len(graph_response.edges)
