export type NodeType = 'file' | 'module' | 'package' | 'class' | 'function';
export type EdgeType = 'IMPORTS' | 'EXPORTS' | 'CALLS' | 'import' | 'dependency';

export interface GraphNodeMetadata {
  sizeBytes?: number;
  size_bytes?: number;
  lineCount?: number;
  line_count?: number;
  in_degree?: number;
  out_degree?: number;
  total_degree?: number;
  unresolved_imports?: string[];
  [key: string]: any;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  type: NodeType;
  language?: string;
  metadata: GraphNodeMetadata;
}

export interface GraphEdgeMetadata {
  imported_symbols?: string[];
  line_numbers?: number[];
  raw_modules?: string[];
  evidence?: string[];
  evidence_count?: number;
  [key: string]: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  metadata: GraphEdgeMetadata;
}

export interface GraphMetrics {
  node_count: number;
  edge_count: number;
  cycle_count: number;
  max_degree: number;
  most_connected_files: Array<{ id: string; path: string; label: string; total_degree: number }>;
  largest_files: Array<{ id: string; path: string; label: string; line_count: number }>;
  unresolved_import_count: number;
}

export interface GraphData {
  repositoryId?: string;
  repository_id?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles?: string[][];
  metrics?: GraphMetrics;
}
