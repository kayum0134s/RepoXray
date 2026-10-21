import { GraphData } from '@/types/graph';
import { Repository, FileItem, FileDetail, DependencySummary } from '@/types/repository';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';
const SERVER_BASE = process.env.NEXT_PUBLIC_SERVER_BASE || 'http://localhost:8000';

export async function submitRepository(url: string): Promise<Repository> {
  const response = await fetch(`${API_BASE}/repositories/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to analyze repository');
  }

  const data = await response.json();
  return {
    id: data.repository_id,
    name: data.name,
    owner: data.owner,
    url: data.url,
    defaultBranch: data.default_branch,
    status: data.status,
    fileCount: data.file_count,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchRepository(repoId: string): Promise<Repository> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}`);
  if (!response.ok) throw new Error(`Failed to fetch repository details for ${repoId}`);
  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    owner: data.owner,
    url: data.url,
    defaultBranch: data.default_branch,
    status: data.status,
    fileCount: data.file_count,
    languageSummary: data.language_summary ? JSON.parse(data.language_summary) : undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function fetchRepositoryGraph(repoId: string): Promise<GraphData> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/graph`);
  if (!response.ok) throw new Error('Failed to fetch repository graph data');
  const data = await response.json();
  return {
    repositoryId: data.repository_id,
    nodes: data.nodes || [],
    edges: data.edges || [],
    cycles: data.cycles || [],
    metrics: data.metrics,
  };
}

export async function fetchRepositoryFiles(repoId: string): Promise<FileItem[]> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/files`);
  if (!response.ok) throw new Error('Failed to fetch file inventory');
  const data = await response.json();
  return data.map((f: any) => ({
    id: f.id,
    repositoryId: f.repository_id,
    path: f.path,
    name: f.name,
    extension: f.extension,
    language: f.language,
    sizeBytes: f.size_bytes,
    lineCount: f.line_count,
  }));
}

export async function fetchFileDetail(repoId: string, fileId: string): Promise<FileDetail> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/files/${fileId}`);
  if (!response.ok) throw new Error('Failed to fetch file details');
  const data = await response.json();
  return {
    file: {
      id: data.file.id,
      repositoryId: data.file.repository_id,
      path: data.file.path,
      name: data.file.name,
      extension: data.file.extension,
      language: data.file.language,
      sizeBytes: data.file.size_bytes,
      lineCount: data.file.line_count,
    },
    symbols: data.symbols || [],
    incomingRelationships: data.incoming_relationships || [],
    outgoingRelationships: data.outgoing_relationships || [],
    unresolvedImports: data.unresolved_imports || [],
  };
}

export async function fetchFileContent(repoId: string, fileId: string): Promise<{
  path: string;
  language?: string;
  line_count: number;
  content: string;
  truncated: boolean;
}> {
  const response = await fetch(`${API_BASE}/files/${repoId}/${fileId}/content`);
  if (!response.ok) throw new Error('Failed to fetch file source content');
  return response.json();
}

export async function fetchRepositoryDependencies(repoId: string): Promise<DependencySummary> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/dependencies`);
  if (!response.ok) throw new Error('Failed to fetch dependency summary');
  const data = await response.json();
  return {
    repositoryId: data.repository_id,
    totalNodes: data.total_nodes,
    totalEdges: data.total_edges,
    totalCycles: data.total_cycles,
    unresolvedImportCount: data.unresolved_import_count,
    unresolvedImports: data.unresolved_imports || [],
    topDependencies: data.top_dependencies || [],
    cycles: data.cycles || [],
  };
}

export async function fetchArchitectureAnalysis(repoId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/analysis/${repoId}`);
  if (!response.ok) throw new Error('Failed to fetch analysis metrics');
  return response.json();
}

export async function explainRepositoryAI(repoId: string, target: string = 'repository', filePath?: string): Promise<any> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, file_path: filePath }),
  });
  if (!response.ok) throw new Error('Failed to run AI explanation');
  return response.json();
}

export async function queryAI(repoId: string, query: string): Promise<any> {
  const response = await fetch(`${API_BASE}/repositories/${repoId}/ai/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repository_id: repoId, query }),
  });
  if (!response.ok) throw new Error('Failed to query AI assistant');
  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_BASE}/health`, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
