# RepoXray 🔍⚡
> **See Inside Any Codebase.** An AI-powered GitHub repository architecture visualizer, dependency graph engine, and codebase intelligence copilot.

---

## 🌟 Overview
**RepoXray** ingests public GitHub repository URLs, scans directory structures, parses multi-language source code ASTs (Python, JavaScript, TypeScript, TSX, JSX), resolves component import relationships, detects circular dependency loops, computes graph metrics, and renders interactive, high-fidelity architectural dependency graphs in real-time.

---

## ✨ Core Features
- **Cinematic Interface**: Token-driven dark design system (Inter + JetBrains Mono), ambient aurora/grid/noise layers, glass surfaces, motion choreography with reduced-motion support, and a single-engine responsive workspace (desktop three-column, mobile three-pane) with document-level accessibility focus states.
- **Performance & Accessibility**: Lazy-loaded graph engine and on-demand panels (landing First Load JS: 117 kB), focus-trapped dialogs with focus return to the trigger, ARIA live pipeline status, skip-to-content link, and reduced-motion handling for both CSS and canvas animations.
- **End-to-End Pipeline**: GitHub URL → Scanning → Language Detection → Multi-Language AST Parsing → Relationship Resolution → Graph Generation → SQLite Persistence → Interactive Visualization.
- **Interactive Cytoscape.js Graph Canvas**: Supports 5 specialized Layout Engines (`Force Directed CoSE`, `Hierarchical DAG`, `Radial Concentric`, `Grid View`).
- **5 Graph View Modes**:
  - `FILE MAP`: Renders file nodes and direct module import edges (`IMPORTS`).
  - `FOLDER MAP`: Aggregates graph elements into directory folder clusters.
  - `IMPORT GRAPH`: Focuses explicitly on module import relationship edges.
  - `DEPENDENCY MAP`: Visualizes top module dependencies and degree hierarchy using radial concentric layout.
  - `ARCHITECTURE`: Organizes nodes into evidence-supported layer tiers (`Frontend`, `API`, `Services`, `Database`, `Infrastructure`).
- **Codebase Exploration System**:
  - **Debounced Search Engine**: Searches across filenames, folder paths, AST symbols, classes, functions, and external dependencies.
  - **Multi-Dimensional Visibility Filters**: Language, Node Category (`Files`, `Folders`, `Tests`, `Config`), Top Directory filters.
  - **Source Code Viewer**: Modal with line numbers, code search filter, copy action, and truncation safety for files > 2,000 lines.
- **Codebase Intelligence Engine**:
  - Summary Metrics, Neutral Hotspot Analysis (identifies core hubs without opinionated bias), Circular Dependency Focus UI (`Focus Cycle`).
  - Evidence-Based Architecture Layer Inference with explicit confidence scores (`High`, `Medium`, `Low`).
- **Multi-Provider AI Architecture Copilot**:
  - Supports `OpenAI-compatible` APIs (`OpenAI`, `Groq`, `OpenRouter`, `DeepSeek`), local `Ollama` models, and an `EvidenceFallbackProvider` guaranteeing zero downtime and zero hallucinations.

---

## 🏗️ Architecture & Pipeline Flow

```
[GitHub URL Input]
       │
       ▼
1. Repository Ingestion    (Cloning / ZIP download / API fetching & caching)
       │
       ▼
2. Repository Scanning     (Directory traversing, ignore filters, file inventory)
       │
       ▼
3. File Discovery          (Identifying code vs config vs asset files)
       │
       ▼
4. Language Detection      (Extension mapping & language profiling)
       │
       ▼
5. Source Parsing          (AST / symbol extraction per language)
       │
       ▼
6. Import Extraction       (Mapping relative/absolute imports to package/file targets)
       │
       ▼
7. Relationship Resolution (Building dependency adjacency list & call graphs)
       │
       ▼
8. Graph Generation        (Constructing node & edge payload with metadata)
       │
       ▼
9. Visualization           (Interactive graph canvas rendering in Next.js)
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js**: `v18.x` or `v20.x+`
- **Python**: `v3.11+`

---

### 1. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Ports
PORT=8000
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
NEXT_PUBLIC_SERVER_BASE=http://localhost:8000

# Optional GitHub Authentication Token (Increases rate limit to 5000 req/hr)
GITHUB_TOKEN=

# Optional AI Copilot Configuration (Fallback provider used if unconfigured)
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Optional Local Ollama Model
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

---

### 2. Backend Setup (FastAPI & SQLite)

From the project root (`d:\repoxray`):

**Windows (PowerShell):**
```powershell
# Navigate to backend folder from root
cd d:\repoxray\backend

# Create & activate Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies & start server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Linux / macOS (Bash):**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend server will run at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

---

### 3. Frontend Setup (Next.js & Cytoscape.js)

From the project root (`d:\repoxray`) or a new terminal window:

**Windows (PowerShell):**
```powershell
# Navigate to frontend folder from root
cd d:\repoxray\frontend

# Install dependencies & start dev server
npm install
npm run dev
```

**Linux / macOS (Bash):**
```bash
cd frontend
npm install
npm run dev
```
Frontend application will run at: `http://localhost:3000`.


---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/repositories/analyze` | Ingest GitHub URL and execute vertical slice analysis pipeline |
| `GET` | `/api/repositories/{id}` | Get repository overview, status, language summary |
| `GET` | `/api/repositories/{id}/graph` | Get resolved graph data (nodes, edges, cycles, metrics) |
| `GET` | `/api/repositories/{id}/files` | List cataloged repository files |
| `GET` | `/api/repositories/{id}/files/{file_id}` | Get single file details, AST symbols, and import relationships |
| `GET` | `/api/files/{repo_id}/{file_id}/content` | Get raw source code content with truncation safety |
| `GET` | `/api/repositories/{id}/dependencies` | Get dependency summary, top connected files, cycles |
| `GET` | `/api/analysis/{repo_id}` | Get codebase intelligence analysis & architecture layers |
| `POST` | `/api/repositories/{id}/ai/explain` | Run target AI explanation (`repository`, `file`, `impact`) |
| `POST` | `/api/repositories/{id}/ai/query` | Run evidence-grounded AI copilot query |

---

## 🧪 Testing Suite

### Run Backend Test Suite (Pytest)
```bash
# From repository root
python -m pytest backend/tests
```

### Run Frontend Production Build & Type Check
```bash
# From frontend directory
cd frontend
npm run build
```

---

## 🔒 Security Measures
- **Zero Repository Code Execution**: Ingested repository source code is parsed strictly in sandbox AST memory; no code is compiled or executed.
- **Path Traversal Protection**: Rejects dangerous shell metacharacters, control characters, and `..` paths via `validate_and_parse_github_url`.
- **Strict GitHub Target Validation**: Accepts only valid public `https://github.com/owner/repo` targets.
- **API Secrets Protection**: Environment tokens (`GITHUB_TOKEN`, `OPENAI_API_KEY`) are never exposed in REST API payloads.
- **Safety Limits**: Limits maximum repository file count (100,000 files), single file scanning size (2 MB), line counting, and parsing timeouts.

---

## 📜 License
MIT License. Built for modern software engineers, software architects, and open-source codebase exploration.
