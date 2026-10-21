export type RepositoryStatus =
  | 'pending'
  | 'queued'
  | 'scanning'
  | 'parsing'
  | 'resolving'
  | 'building_graph'
  | 'completed'
  | 'failed';

export interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  status: RepositoryStatus;
  fileCount: number;
  languageSummary?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  repositoryId: string;
  path: string;
  name: string;
  extension?: string;
  language?: string;
  sizeBytes: number;
  lineCount: number;
}

export interface SymbolItem {
  name: string;
  type: string;
  line_number?: number;
}

export interface RelationshipItem {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata: Record<string, any>;
}

export interface FileDetail {
  file: FileItem;
  symbols: SymbolItem[];
  incomingRelationships: RelationshipItem[];
  outgoingRelationships: RelationshipItem[];
  unresolvedImports: string[];
}

export interface DependencySummary {
  repositoryId: string;
  totalNodes: number;
  totalEdges: number;
  totalCycles: number;
  unresolvedImportCount: number;
  unresolvedImports: Array<{ file_path: string; unresolved_imports: string[] }>;
  topDependencies: Array<{ id: string; path: string; label: string; total_degree: number }>;
  cycles: string[][];
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: FileTreeNode[];
}
