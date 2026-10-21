'use client';

import React, { useEffect, useState } from 'react';
import { CodebaseIntelligenceData } from '@/types/analysis';
import { fetchArchitectureAnalysis } from '@/lib/api';
import {
  BrainCircuit,
  CheckCircle2,
  TriangleAlert,
  Layers,
  Network,
  Folder,
  FileCode2,
  ChevronRight,
  Focus,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface IntelligencePanelProps {
  repoId: string;
  onFocusCycle?: (cyclePaths: string[]) => void;
  onSelectNodeByPath?: (path: string) => void;
}

type Tab = 'overview' | 'hotspots' | 'cycles' | 'architecture';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'hotspots', label: 'Hotspots' },
  { id: 'cycles', label: 'Cycles' },
  { id: 'architecture', label: 'Layers' },
];

const CONFIDENCE_STYLES: Record<string, string> = {
  High: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300',
  Medium: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300',
  Low: 'border-red-400/25 bg-red-400/[0.08] text-red-300',
};

export default function IntelligencePanel({
  repoId,
  onFocusCycle,
  onSelectNodeByPath,
}: IntelligencePanelProps) {
  const [data, setData] = useState<CodebaseIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!repoId) return;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetchArchitectureAnalysis(repoId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        console.error('Failed to load codebase intelligence:', err);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoId, reloadKey]);

  if (loading) {
    return (
      <div className="panel flex items-center gap-2.5 px-4 py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          Computing codebase intelligence
        </span>
        <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full w-1/2 animate-sweep bg-cyan-300/70" />
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="panel flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        <TriangleAlert className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-mono text-[10px] text-slate-400">
          Intelligence analysis is unavailable for this repository.
        </span>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="btn ml-auto h-6 px-2 text-[9.5px]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.overview) return null;

  const { overview, hotspots, cycles, architecture_inference } = data;
  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  const stats = [
    { label: 'Files', value: overview.file_count, icon: FileCode2, tone: 'text-cyan-300' },
    { label: 'Folders', value: overview.folder_count, icon: Folder, tone: 'text-emerald-300' },
    { label: 'Nodes', value: overview.node_count, icon: Network, tone: 'text-indigo-300' },
    { label: 'Edges', value: overview.edge_count, icon: Layers, tone: 'text-fuchsia-300' },
  ];

  return (
    <section className="animate-fade-up panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.055] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-cyan-300" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Codebase intelligence
          </span>
          <span className="hidden font-mono text-[9px] text-slate-600 sm:inline">
            · evidence based
          </span>
        </div>

        <div className="flex items-center gap-2">
          {architecture_inference && (
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-medium ${
                CONFIDENCE_STYLES[architecture_inference.confidence_level] ||
                CONFIDENCE_STYLES.Medium
              }`}
            >
              <ShieldCheck className="h-2.5 w-2.5" />
              {architecture_inference.confidence_level} confidence ·{' '}
              {architecture_inference.confidence_percentage}%
            </span>
          )}

          {/* Tabs */}
          <div className="relative flex items-center rounded-lg border border-white/[0.06] bg-black/40 p-0.5">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[68px] rounded-md bg-white/[0.07] ring-1 ring-inset ring-cyan-300/15 transition-transform duration-300 ease-smooth"
              style={{ transform: `translateX(${activeIndex * 68}px)` }}
            />
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 w-[68px] py-1 font-mono text-[9.5px] transition-colors ${
                  activeTab === tab.id ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {tab.id === 'hotspots' && hotspots.length > 0 && (
                  <span className="ml-1 text-[8px] text-slate-600">{hotspots.length}</span>
                )}
                {tab.id === 'cycles' && (
                  <span
                    className={`ml-1 text-[8px] ${cycles.length ? 'text-amber-400/80' : 'text-slate-600'}`}
                  >
                    {cycles.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[210px] overflow-y-auto p-3">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-lg border border-white/[0.055] bg-black/25 px-2.5 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-slate-600">
                    {label}
                  </span>
                  <Icon className={`h-3 w-3 ${tone} opacity-70`} />
                </div>
                <p className="mt-1 font-mono text-[17px] font-semibold leading-none tabular-nums text-slate-100">
                  {value.toLocaleString()}
                </p>
              </div>
            ))}
            <div className="col-span-2 flex items-center gap-2 rounded-lg border border-white/[0.055] bg-black/20 px-2.5 py-1.5 sm:col-span-4">
              <Sparkles className="h-3 w-3 shrink-0 text-cyan-300/80" />
              <p className="font-mono text-[9.5px] leading-relaxed text-slate-500">
                {overview.dependency_count.toLocaleString()} dependency relations across{' '}
                {overview.node_count.toLocaleString()} nodes · branch{' '}
                <span className="text-slate-400">{overview.branch}</span>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'hotspots' && (
          <div className="flex flex-col gap-1">
            <p className="mb-1 font-mono text-[9px] leading-relaxed text-slate-600">
              Highly connected files act as core module hubs. Connectivity signals centrality, not debt.
            </p>
            {hotspots.length === 0 && (
              <p className="py-4 text-center font-mono text-[10px] text-slate-600">
                No connected hubs detected.
              </p>
            )}
            {hotspots.map((h) => (
              <button
                key={h.id}
                onClick={() => onSelectNodeByPath?.(h.path)}
                className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-all duration-200 hover:border-white/[0.07] hover:bg-white/[0.03]"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-white/[0.06] bg-white/[0.03] font-mono text-[9px] tabular-nums text-slate-400">
                  {h.connections}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-[10.5px] text-slate-200 group-hover:text-cyan-200">
                    {h.label}
                  </span>
                  <span className="truncate font-mono text-[9px] text-slate-600">
                    {h.role_description}
                  </span>
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
              </button>
            ))}
          </div>
        )}

        {activeTab === 'cycles' && (
          <div className="flex flex-col gap-1.5">
            {cycles.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] py-5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-300/90">
                  No circular dependencies — clean module boundaries.
                </span>
              </div>
            ) : (
              cycles.map((cycle, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-amber-400/20 bg-amber-400/[0.04] p-2"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-medium text-amber-300">
                      <TriangleAlert className="h-2.5 w-2.5" />
                      Cycle {idx + 1} · {cycle.length} nodes
                    </span>
                    {onFocusCycle && (
                      <button
                        onClick={() => onFocusCycle(cycle)}
                        className="inline-flex items-center gap-1 rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[8.5px] text-amber-200 transition-colors hover:bg-amber-400/20"
                      >
                        <Focus className="h-2.5 w-2.5" />
                        Focus
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 font-mono text-[9px]">
                    {cycle.map((item, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-amber-500/60">→</span>}
                        <span className="rounded border border-white/[0.05] bg-black/30 px-1 py-px text-slate-400">
                          {item.split('/').pop()}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[9px] leading-relaxed text-slate-600">
              {architecture_inference.confidence_reason}
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(architecture_inference.layers).map(([layerName, info]) => (
                <div
                  key={layerName}
                  className="rounded-lg border border-white/[0.055] bg-black/25 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] font-medium text-slate-200">
                      {layerName}
                    </span>
                    <span className="shrink-0 rounded bg-white/[0.04] px-1 py-px font-mono text-[8.5px] tabular-nums text-cyan-300/80">
                      {info.file_count}
                    </span>
                  </div>
                  {info.paths[0] && (
                    <p className="mt-1 truncate font-mono text-[8.5px] text-slate-600">
                      {info.paths[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
