'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Core } from 'cytoscape';
import { GraphData } from '@/types/graph';
import { motionDuration } from '@/lib/motion';
import GraphControls from './GraphControls';
import GraphLegend from './GraphLegend';
import ShortcutsModal from './ShortcutsModal';
import { LayoutName, LAYOUT_OPTIONS } from '@/lib/graphLayouts';
import { Network, Layers, TriangleAlert, ScanSearch, Cpu } from 'lucide-react';

import { FilterState } from '@/components/panels/FilterPanel';
import { GraphViewMode } from '@/components/layout/TopBar';

// The graph engine is lazy-loaded so the landing page never pays for Cytoscape.
const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300/80" />
    </div>
  ),
});

interface GraphShellProps {
  data: GraphData | null;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  isLoading?: boolean;
  onFocusSearch?: () => void;
  filters?: FilterState;
  graphViewMode?: GraphViewMode;
  onChangeViewMode?: (mode: GraphViewMode) => void;
}

const MODE_LABELS: Record<GraphViewMode, string> = {
  file_map: 'File map',
  folder_map: 'Folder map',
  import_graph: 'Import graph',
  dependency_map: 'Dependency map',
  architecture: 'Architecture tiers',
};

export default function GraphShell({
  data,
  selectedNodeId,
  onSelectNode,
  isLoading,
  onFocusSearch,
  filters,
  graphViewMode = 'file_map',
  onChangeViewMode,
}: GraphShellProps) {
  const [currentLayout, setCurrentLayout] = useState<LayoutName>('force');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const cyRef = useRef<Core | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const cycles = data?.cycles || [];
  const metrics = data?.metrics;

  const handleCyInit = useCallback((cy: Core) => {
    cyRef.current = cy;
  }, []);

  /* ------------------------------------------------------------------ */
  /* Viewport actions                                                    */
  /* ------------------------------------------------------------------ */
  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate(
      { zoom: Math.min(cy.zoom() * 1.25, cy.maxZoom()) },
      { duration: motionDuration(220), easing: 'ease-out' }
    );
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate(
      { zoom: Math.max(cy.zoom() / 1.25, cy.minZoom()) },
      { duration: motionDuration(220), easing: 'ease-out' }
    );
  };

  const handleFit = () => {
    cyRef.current?.animate(
      { fit: { eles: cyRef.current.elements(), padding: 56 } },
      { duration: motionDuration(380), easing: 'ease-out' }
    );
  };

  const handleReset = () => {
    const cy = cyRef.current;
    if (!cy) return;
    const layoutOption = LAYOUT_OPTIONS[currentLayout] || LAYOUT_OPTIONS.force;
    cy.layout({
      ...(layoutOption as any),
      animate: true,
      animationDuration: motionDuration(500),
      fit: true,
      padding: 56,
    } as any).run();
  };

  const handleCenter = () => {
    const cy = cyRef.current;
    if (!cy) return;
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId);
      if (node.length) {
        cy.animate({ center: { eles: node } }, { duration: motionDuration(320), easing: 'ease-out' });
        return;
      }
    }
    cy.animate({ center: { eles: cy.elements() } }, { duration: motionDuration(320), easing: 'ease-out' });
  };

  const handleToggleFullscreen = () => {
    if (!shellRef.current) return;
    if (!document.fullscreenElement) {
      shellRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // A modal dialog owns Escape while it is open.
      if (document.querySelector('[role="dialog"]')) return;

      const key = e.key.toUpperCase();

      if (key === 'F') {
        e.preventDefault();
        handleFit();
      } else if (key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false);
        else if (onSelectNode) onSelectNode(null);
      } else if (e.key === '/') {
        e.preventDefault();
        onFocusSearch?.();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts, currentLayout, selectedNodeId, onSelectNode, onFocusSearch]);

  return (
    <div
      ref={shellRef}
      className={`group/shell relative flex h-full w-full flex-col overflow-hidden border border-white/[0.06] bg-surface/70 shadow-panel backdrop-blur-xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'rounded-2xl'
      }`}
    >
      {/* Header */}
      <div className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.055] bg-black/20 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
            <Network className="h-3 w-3" />
          </span>

          <div className="flex min-w-0 flex-col">
            <span className="hidden truncate text-[11.5px] font-medium leading-tight text-slate-200 md:block">
              {MODE_LABELS[graphViewMode]}
            </span>
            {onChangeViewMode && (
              <select
                value={graphViewMode}
                onChange={(e) => onChangeViewMode(e.target.value as GraphViewMode)}
                aria-label="Graph view mode"
                className="max-w-[9.5rem] cursor-pointer truncate rounded border border-white/[0.07] bg-black/40 px-1 py-0.5 font-mono text-[10px] text-slate-200 outline-none md:hidden"
              >
                {(Object.keys(MODE_LABELS) as GraphViewMode[]).map((mode) => (
                  <option key={mode} value={mode} className="bg-[#0b1018]">
                    {MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            )}
            <span className="font-mono text-[9px] leading-tight text-slate-600">
              {nodes.length} nodes · {edges.length} edges
              {cycles.length > 0 ? ` · ${cycles.length} cycles` : ''}
            </span>
          </div>

          {cycles.length > 0 && (
            <span className="ml-1 hidden items-center gap-1 rounded-md border border-amber-400/25 bg-amber-400/[0.07] px-1.5 py-0.5 font-mono text-[9px] font-medium text-amber-300 sm:inline-flex">
              <TriangleAlert className="h-2.5 w-2.5" />
              cycle detected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {metrics && (
            <span className="hidden font-mono text-[9px] text-slate-600 lg:inline">
              max degree <strong className="font-semibold text-slate-400">{metrics.max_degree}</strong>
            </span>
          )}
          <GraphControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onReset={handleReset}
            onCenter={handleCenter}
            currentLayout={currentLayout}
            onChangeLayout={setCurrentLayout}
            onToggleShortcuts={() => setShowShortcuts(true)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((v) => !v)}
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Backdrop layers */}
        <div className={`pointer-events-none absolute inset-0 ${showGrid ? 'dot-grid opacity-60' : ''}`} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 70% at 50% 45%, rgba(34,211,238,0.045), transparent 65%), radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(4,6,11,0.85) 100%)',
          }}
        />

        {isLoading ? (
          <div className="relative flex h-full flex-col items-center justify-center gap-4">
            <div className="relative grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-full border border-dashed border-cyan-300/20 animate-spin-slow" />
              <span className="absolute inset-2 rounded-full border border-white/[0.06]" />
              <Cpu className="h-5 w-5 animate-pulse-soft text-cyan-300" />
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
                Resolving graph
              </p>
              <p className="mt-1 font-mono text-[9.5px] text-slate-600">
                mapping imports → edges
              </p>
            </div>
          </div>
        ) : nodes.length > 0 ? (
          <>
            <GraphCanvas
              data={data}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              layoutName={currentLayout}
              onCyInit={handleCyInit}
              filters={filters}
              graphViewMode={graphViewMode}
            />

            {/* Floating legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[75%]">
              <GraphLegend data={data} />
            </div>

            {/* Hint */}
            <div className="pointer-events-none absolute bottom-3 right-3 z-20 hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-base/70 px-2 py-1 font-mono text-[9px] text-slate-600 backdrop-blur-md sm:flex">
              <kbd className="kbd h-4 border-white/[0.06] bg-white/[0.03] px-1 text-[8.5px] text-slate-500">F</kbd>
              fit
              <span className="mx-0.5 text-slate-800">·</span>
              <kbd className="kbd h-4 border-white/[0.06] bg-white/[0.03] px-1 text-[8.5px] text-slate-500">?</kbd>
              shortcuts
            </div>
          </>
        ) : (
          <div className="relative flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="relative grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
              <span className="absolute inset-0 rounded-2xl border border-cyan-300/10" style={{ transform: 'rotate(12deg)' }} />
              <Layers className="relative h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-300">No graph to display</p>
              <p className="mx-auto mt-1 max-w-[19rem] font-mono text-[10px] leading-relaxed text-slate-600">
                Analyze a repository to render its dependency map.
              </p>
            </div>
            {onFocusSearch && (
              <button onClick={onFocusSearch} className="btn">
                <ScanSearch className="h-3 w-3" />
                Search codebase
                <span className="kbd ml-1 h-4 px-1 text-[8.5px]">/</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
