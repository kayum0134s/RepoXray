export interface OverviewMetrics {
  repository_name: string;
  owner: string;
  branch: string;
  languages: Record<string, number>;
  file_count: number;
  folder_count: number;
  dependency_count: number;
  node_count: number;
  edge_count: number;
}

export interface HotspotItem {
  id: string;
  path: string;
  label: string;
  connections: number;
  role_description: string;
}

export interface ArchitectureLayerInfo {
  file_count: number;
  paths: string[];
}

export interface ArchitectureInference {
  confidence_level: 'High' | 'Medium' | 'Low';
  confidence_percentage: number;
  confidence_reason: string;
  layers: Record<string, ArchitectureLayerInfo>;
}

export interface CodebaseIntelligenceData {
  repository_id: string;
  overview: OverviewMetrics;
  hotspots: HotspotItem[];
  cycles: string[][];
  architecture_inference: ArchitectureInference;
}

export interface AIQueryResponse {
  query: string;
  answer: string;
  contextSummary?: {
    fileCount: number;
  };
}
