from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import os
import httpx
from app.utils.logger import logger

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str, context: Dict[str, Any]) -> str:
        pass

class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate(self, prompt: str, system_prompt: str, context: Dict[str, Any]) -> str:
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Repository Evidence Context:\n{context}\n\nUser Request:\n{prompt}"}
            ],
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]

class OllamaProvider(BaseAIProvider):
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = model or os.getenv("OLLAMA_MODEL", "llama3")

    async def generate(self, prompt: str, system_prompt: str, context: Dict[str, Any]) -> str:
        payload = {
            "model": self.model,
            "prompt": f"System:\n{system_prompt}\n\nContext:\n{context}\n\nUser Question:\n{prompt}",
            "stream": False
        }
        async with httpx.AsyncClient(timeout=40.0) as client:
            res = await client.post(f"{self.base_url}/api/generate", json=payload)
            res.raise_for_status()
            data = res.json()
            return data.get("response", "")

class EvidenceFallbackProvider(BaseAIProvider):
    """
    Deterministic, evidence-grounded fallback provider when no API key or local LLM is available.
    Guarantees 100% reliability based strictly on SQLite AST & dependency evidence.
    """
    async def generate(self, prompt: str, system_prompt: str, context: Dict[str, Any]) -> str:
        target = context.get("target", "repository")
        repo_name = context.get("repo_name", "Ingested Repository")
        file_count = context.get("file_count", 0)
        hotspots = context.get("hotspots", [])
        cycles = context.get("cycles", [])
        selected_file = context.get("selected_file")
        impact_analysis = context.get("impact_analysis")

        if target == "impact" or "change" in prompt.lower() or "impact" in prompt.lower():
            if impact_analysis:
                f_path = impact_analysis.get("path", "file")
                in_count = impact_analysis.get("incoming_count", 0)
                out_count = impact_analysis.get("outgoing_count", 0)
                level = impact_analysis.get("impact_level", "MEDIUM")
                dependents = impact_analysis.get("dependents", [])

                res = f"### Impact Analysis: `{f_path}`\n\n"
                res += f"- **Impact Level**: **{level}**\n"
                res += f"- **Incoming Dependents (`imported-by`)**: {in_count} files\n"
                res += f"- **Outgoing Dependencies (`imports`)**: {out_count} files\n\n"
                if in_count > 0:
                    res += f"Modifying `{f_path}` will directly affect the following downstream modules:\n"
                    for d in dependents[:8]:
                        res += f"- `{d}`\n"
                else:
                    res += f"`{f_path}` has zero incoming import dependents, making modifications low risk for breaking other modules.\n"
                return res

        if target == "auth_flow":
            auth_files = [f for f in context.get("files", []) if any(k in f.lower() for k in ["auth", "login", "jwt", "token", "session"])]
            res = "### Authentication Flow Evidence\n\n"
            if auth_files:
                res += f"Identified **{len(auth_files)}** authentication-related components in the codebase:\n"
                for af in auth_files[:8]:
                    res += f"- `{af}`\n"
            else:
                res += "No explicit `auth` or `jwt` module paths identified in file inventory.\n"
            return res

        if target == "db_flow":
            db_files = [f for f in context.get("files", []) if any(k in f.lower() for k in ["db", "database", "model", "schema", "orm"])]
            res = "### Database & Data Model Flow Evidence\n\n"
            if db_files:
                res += f"Identified **{len(db_files)}** database and model components in the codebase:\n"
                for df in db_files[:8]:
                    res += f"- `{df}`\n"
            else:
                res += "No explicit `db` or `model` paths identified in file inventory.\n"
            return res

        if selected_file:
            path = selected_file.get("path")
            lines = selected_file.get("line_count", 0)
            lang = selected_file.get("language", "Unknown")
            symbols = selected_file.get("symbols", [])
            in_deps = selected_file.get("imported_by", [])
            out_deps = selected_file.get("imports", [])

            res = f"### Component Analysis: `{path}`\n\n"
            res += f"- **Language**: {lang}\n"
            res += f"- **Line Count**: {lines} lines\n"
            res += f"- **AST Symbols Extracted**: {len(symbols)} symbols\n"
            res += f"- **Incoming Dependents (`imported-by`)**: {len(in_deps)} files\n"
            res += f"- **Outgoing Imports (`imports`)**: {len(out_deps)} files\n\n"

            if symbols:
                res += "**Key Extracted Symbols**:\n"
                for s in symbols[:6]:
                    res += f"- `{s.get('name')}` ({s.get('type')})\n"
            return res

        # Default repository explanation
        res = f"### Repository Structural Summary: `{repo_name}`\n\n"
        res += f"- **Cataloged Files**: {file_count} files\n"
        res += f"- **Top Module Hubs**: {len(hotspots)} connected files identified\n"
        res += f"- **Circular Dependency Loops**: {len(cycles)} cycle loops detected\n\n"
        if hotspots:
            res += "**Primary Architectural Hubs**:\n"
            for h in hotspots[:5]:
                res += f"- `{h.get('path')}` ({h.get('connections')} connections) — {h.get('role_description')}\n"
        return res
