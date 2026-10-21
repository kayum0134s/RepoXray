'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import TopBar, { GraphViewMode } from '@/components/layout/TopBar';
import StatusBar from '@/components/layout/StatusBar';
import RepositoryInput from '@/components/repository/RepositoryInput';
import RepositoryOverview from '@/components/repository/RepositoryOverview';
import Sidebar from '@/components/repository/Sidebar';
import GraphShell from '@/components/graph/GraphShell';
import NodeDetails from '@/components/panels/NodeDetails';
import AIChat from '@/components/panels/AIChat';

// On-demand panels stay out of the initial bundle.
const FilePreviewModal = dynamic(() => import('@/components/panels/FilePreviewModal'), { ssr: false });
const IntelligencePanel = dynamic(() => import('@/components/panels/IntelligencePanel'), { ssr: false });

import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import { FilterState } from '@/components/panels/FilterPanel';

import { Repository, FileItem } from '@/types/repository';
import { GraphData, GraphNode } from '@/types/graph';
import {
  submitRepository,
  fetchRepository,
  fetchRepositoryGraph,
  fetchRepositoryFiles,
} from '@/lib/api';
import { FolderTree, Network, PanelRight, MousePointerClick, Sparkles } from 'lucide-react';

type MobilePane = 'explorer' | 'graph' | 'inspector';

const EMPTY_FILTERS: FilterState = {
  languages: [],
  nodeTypes: [],
  relationshipTypes: [],
  directories: [],
};

export default function Home() {
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined);

  const [previewFile, setPreviewFile] = useState<{ id: string; path: string } | null>(null);
  const [showIntelligence, setShowIntelligence] = useState<boolean>(false);

  const [graphViewMode, setGraphViewMode] = useState<GraphViewMode>('file_map');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [mobilePane, setMobilePane] = useState<MobilePane>('graph');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Only one workspace layout is mounted at a time so a single graph engine runs.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Pipeline                                                            */
  /* ------------------------------------------------------------------ */
  const handleIngestRepo = async (url: string) => {
    setSubmitting(true);
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setSelectedFileId(undefined);
    setShowIntelligence(false);
    setFilters(EMPTY_FILTERS);

    try {
      const repo = await submitRepository(url);
      setActiveRepo(repo);

      const [graph, fileList] = await Promise.all([
        fetchRepositoryGraph(repo.id),
        fetchRepositoryFiles(repo.id),
      ]);

      setGraphData(graph);
      setFiles(fileList);

      const updatedRepo = await fetchRepository(repo.id).catch(() => repo);
      setActiveRepo(updatedRepo);
      setMobilePane('graph');
    } catch (err: any) {
      console.error('Ingestion pipeline error:', err);
      setError(err?.message || 'Failed to ingest and analyze the target repository.');
      setActiveRepo(null);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleNewAnalysis = useCallback(() => {
    setActiveRepo(null);
    setGraphData(null);
    setFiles([]);
    setSelectedNode(null);
    setSelectedFileId(undefined);
    setError(null);
    setPreviewFile(null);
    setShowIntelligence(false);
    setFilters(EMPTY_FILTERS);
    setGraphViewMode('file_map');
  }, []);

  /* ------------------------------------------------------------------ */
  /* Selection                                                           */
  /* ------------------------------------------------------------------ */
  const selectNodeById = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) {
        setSelectedNode(null);
        setSelectedFileId(undefined);
        return;
      }
      if (!graphData?.nodes) return;

      const matchNode = graphData.nodes.find((n) => n.id === nodeId || n.path === nodeId);
      if (!matchNode) return;

      setSelectedNode(matchNode);
      const matchFile = files.find((f) => f.path === matchNode.path);
      if (matchFile) setSelectedFileId(matchFile.id);
    },
    [graphData, files]
  );

  const handleSelectFile = (file: FileItem) => {
    setSelectedFileId(file.id);
    if (graphData?.nodes) {
      const matchNode = graphData.nodes.find((n) => n.path === file.path || n.id === file.id);
      if (matchNode) setSelectedNode(matchNode);
    }
    setMobilePane('graph');
  };

  const handleSelectNodeByPath = (path: string) => {
    const matchNode = graphData?.nodes?.find((n) => n.path === path);
    if (!matchNode) return;
    setSelectedNode(matchNode);
    const matchFile = files.find((f) => f.path === path);
    if (matchFile) setSelectedFileId(matchFile.id);
    setMobilePane('graph');
  };

  const handleFocusCycle = (cyclePaths: string[]) => {
    if (cyclePaths.length > 0) handleSelectNodeByPath(cyclePaths[0]);
  };

  const handleOpenFilePreview = (path: string, fileId: string) => {
    setPreviewFile({ id: fileId, path });
  };

  const handleFocusSearch = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      searchInputRef.current?.focus();
    } else {
      setMobilePane('explorer');
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  };

  /* Global shortcut: Escape clears inspector */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }
      // Let an open dialog handle its own Escape without clearing the selection.
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'Escape' && !previewFile) {
        setSelectedNode(null);
        setSelectedFileId(undefined);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewFile]);

  const isWorkspace = Boolean(activeRepo) && !loading && !error;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <TopBar
        repo={activeRepo}
        onNewAnalysis={handleNewAnalysis}
        graphViewMode={graphViewMode}
        setGraphViewMode={setGraphViewMode}
        onToggleIntelligence={() => setShowIntelligence((v) => !v)}
        showIntelligence={showIntelligence}
      />

      {/* Pipeline progress hairline */}
      <div className="relative h-px w-full overflow-hidden bg-transparent">
        {loading && (
          <span className="absolute inset-y-0 left-0 w-1/3 animate-sweep bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        )}
      </div>

      <main id="main" className="relative flex min-h-0 flex-1 flex-col">
        {/* Landing */}
        {!activeRepo && !loading && !error && (
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <RepositoryInput onSubmit={handleIngestRepo} isLoading={submitting || loading} />
          </div>
        )}

        {/* Pipeline running */}
        {loading && (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10">
            <LoadingState status={activeRepo?.status || 'scanning'} />
          </div>
        )}

        {/* Failure */}
        {error && !loading && (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10">
            <ErrorState message={error} onRetry={handleNewAnalysis} />
          </div>
        )}

        {/* Workspace */}
        {isWorkspace && activeRepo && (
          <div className="animate-fade-in flex min-h-0 flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
            <RepositoryOverview repo={activeRepo} />

            {showIntelligence && (
              <div className="animate-fade-up">
                <IntelligencePanel
                  repoId={activeRepo.id}
                  onFocusCycle={handleFocusCycle}
                  onSelectNodeByPath={handleSelectNodeByPath}
                />
              </div>
            )}

            {isDesktop === null ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300/80" />
              </div>
            ) : isDesktop ? (
            /* Desktop three-column layout */
            <div className="flex min-h-0 flex-1 gap-2.5">
              <div className="w-[286px] shrink-0 xl:w-[314px]">
                <Sidebar
                  files={files}
                  graphData={graphData}
                  selectedFileId={selectedFileId}
                  onSelectFile={handleSelectFile}
                  onSelectNodeId={selectNodeById}
                  languageSummary={activeRepo.languageSummary}
                  filters={filters}
                  onFilterChange={setFilters}
                  searchRef={searchInputRef}
                />
              </div>

              <div className="min-w-0 flex-1">
                <GraphShell
                  data={graphData}
                  selectedNodeId={selectedNode?.id}
                  onSelectNode={selectNodeById}
                  isLoading={loading}
                  onFocusSearch={handleFocusSearch}
                  filters={filters}
                  graphViewMode={graphViewMode}
                  onChangeViewMode={setGraphViewMode}
                />
              </div>

              {selectedNode ? (
                <aside className="animate-slide-in-right flex w-[330px] shrink-0 flex-col gap-2.5 overflow-y-auto pb-1 pr-0.5 xl:w-[356px]">
                  <NodeDetails
                    node={selectedNode}
                    repoId={activeRepo.id}
                    onClose={() => {
                      setSelectedNode(null);
                      setSelectedFileId(undefined);
                    }}
                    onOpenFile={handleOpenFilePreview}
                    onFocusNeighbors={(id) => selectNodeById(id)}
                  />
                  <AIChat repoId={activeRepo.id} selectedFilePath={selectedNode.path} />
                </aside>
              ) : (
                <aside className="hidden w-[300px] shrink-0 flex-col gap-2.5 xl:flex">
                  <AIChat repoId={activeRepo.id} />
                  <InspectorHint onFocusSearch={handleFocusSearch} />
                </aside>
              )}
            </div>
            ) : (
            /* Mobile layout */
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                {mobilePane === 'graph' && (
                  <GraphShell
                    data={graphData}
                    selectedNodeId={selectedNode?.id}
                    onSelectNode={(id) => {
                      selectNodeById(id);
                      if (id) setMobilePane('inspector');
                    }}
                    isLoading={loading}
                    onFocusSearch={handleFocusSearch}
                    filters={filters}
                    graphViewMode={graphViewMode}
                    onChangeViewMode={setGraphViewMode}
                  />
                )}

                {mobilePane === 'explorer' && (
                  <Sidebar
                    files={files}
                    graphData={graphData}
                    selectedFileId={selectedFileId}
                    onSelectFile={handleSelectFile}
                    onSelectNodeId={(id) => {
                      selectNodeById(id);
                      setMobilePane('inspector');
                    }}
                    languageSummary={activeRepo.languageSummary}
                    filters={filters}
                    onFilterChange={setFilters}
                    searchRef={searchInputRef}
                  />
                )}

                {mobilePane === 'inspector' && (
                  <div className="flex h-full flex-col gap-2.5 overflow-y-auto pb-1">
                    {selectedNode ? (
                      <NodeDetails
                        node={selectedNode}
                        repoId={activeRepo.id}
                        onClose={() => {
                          setSelectedNode(null);
                          setSelectedFileId(undefined);
                        }}
                        onOpenFile={handleOpenFilePreview}
                        onFocusNeighbors={(id) => selectNodeById(id)}
                      />
                    ) : (
                      <div className="panel flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                        <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-500">
                          <MousePointerClick className="h-5 w-5" />
                        </span>
                        <p className="text-[13px] font-medium text-slate-300">Nothing selected</p>
                        <p className="max-w-[15rem] font-mono text-[10.5px] leading-relaxed text-slate-500">
                          Tap any node in the graph to inspect its symbols, imports and dependents.
                        </p>
                        <button onClick={() => setMobilePane('graph')} className="btn mt-1">
                          <Network className="h-3 w-3" />
                          Back to graph
                        </button>
                      </div>
                    )}
                    <AIChat repoId={activeRepo.id} selectedFilePath={selectedNode?.path} />
                  </div>
                )}
              </div>

              {/* Mobile pane switcher */}
              <nav className="mt-2.5 grid shrink-0 grid-cols-3 gap-1 rounded-xl border border-white/[0.06] bg-black/50 p-1 backdrop-blur-xl">
                {(
                  [
                    { id: 'explorer', label: 'Explorer', icon: FolderTree },
                    { id: 'graph', label: 'Graph', icon: Network },
                    { id: 'inspector', label: 'Inspector', icon: PanelRight },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMobilePane(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-mono text-[10px] transition-colors ${
                      mobilePane === id
                        ? 'bg-white/[0.08] text-cyan-200 ring-1 ring-inset ring-cyan-300/20'
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            )}
          </div>
        )}
      </main>

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        repoId={activeRepo?.id}
        fileId={previewFile?.id}
        filePath={previewFile?.path}
        onClose={() => setPreviewFile(null)}
      />

      <StatusBar repo={activeRepo} graphData={graphData} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty inspector helper                                              */
/* ------------------------------------------------------------------ */
function InspectorHint({ onFocusSearch }: { onFocusSearch: () => void }) {
  return (
    <div className="panel flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-500">
        <MousePointerClick className="h-5 w-5" />
      </span>
      <p className="text-[13px] font-medium text-slate-300">Inspect a node</p>
      <p className="max-w-[14rem] font-mono text-[10.5px] leading-relaxed text-slate-500">
        Select any node to reveal its symbols, dependency edges and AI explanation.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button onClick={onFocusSearch} className="btn">
          <Sparkles className="h-3 w-3 text-cyan-300" />
          Search code
        </button>
        <span className="kbd">/</span>
      </div>
    </div>
  );
}
