import { useState, useCallback } from 'react';
import { GraphData, GraphNode } from '@/types/graph';
import { fetchRepositoryGraph } from '@/lib/api';

export function useGraph() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = useCallback(async (repoId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRepositoryGraph(repoId);
      setGraphData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repository graph');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    graphData,
    selectedNode,
    setSelectedNode,
    loading,
    error,
    loadGraph,
  };
}
