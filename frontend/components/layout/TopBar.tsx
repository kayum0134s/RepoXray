'use client';

import React from 'react';
import { Repository } from '@/types/repository';
import {
  Aperture,
  GitBranch,
  Plus,
  LayoutGrid,
  FileCode2,
  Network,
  FolderTree,
  Layers,
  BrainCircuit,
  CircleDot,
} from 'lucide-react';

export type GraphViewMode =
  | 'file_map'
  | 'folder_map'
  | 'import_graph'
  | 'dependency_map'
  | 'architecture';

interface TopBarProps {
  repo: Repository | null;
  onNewAnalysis: () => void;
  graphViewMode: GraphViewMode;
  setGraphViewMode: (mode: GraphViewMode) => void;
  onToggleIntelligence?: () => void;
  showIntelligence?: boolean;
}

const VIEW_MODES: Array<{
  id: GraphViewMode;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}> = [
  { id: 'file_map', label: 'File Map', short: 'Files', icon: FileCode2, hint: 'Files + direct imports' },
  { id: 'folder_map', label: 'Folder Map', short: 'Folders', icon: FolderTree, hint: 'Aggregated by directory' },
  { id: 'import_graph', label: 'Imports', short: 'Imports', icon: Network, hint: 'Module import edges' },
  { id: 'dependency_map', label: 'Dependency', short: 'Deps', icon: LayoutGrid, hint: 'Degree-ranked hubs' },
  { id: 'architecture', label: 'Architecture', short: 'Layers', icon: Layers, hint: 'Inferred layer tiers' },
];

export default function TopBar({
  repo,
  onNewAnalysis,
  graphViewMode,
  setGraphViewMode,
  onToggleIntelligence,
  showIntelligence,
}: TopBarProps) {
  const activeIndex = Math.max(
    0,
    VIEW_MODES.findIndex((m) => m.id === graphViewMode)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.055] bg-base/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 w-full items-center gap-4 px-4 lg:px-6">
        {/* Brand */}
        <button
          onClick={onNewAnalysis}
          className="group flex shrink-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          aria-label="RepoXray home"
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-cyan-300 via-cyan-400 to-indigo-500 text-slate-950 shadow-[0_6px_20px_-8px_rgba(34,211,238,0.9)] transition-transform duration-300 group-hover:scale-105">
            <Aperture className="h-[18px] w-[18px]" strokeWidth={2.4} />
            <span className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/30" />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="text-[13px] font-semibold tracking-tight text-white">
              Repo<span className="text-cyan-300">Xray</span>
            </span>
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
              Architecture engine
            </span>
          </span>
        </button>

        {/* Repository breadcrumb */}
        {repo ? (
          <div className="hidden min-w-0 items-center gap-2.5 border-l border-white/10 pl-4 md:flex">
            <CircleDot
              className={`h-3 w-3 shrink-0 ${
                repo.status === 'completed'
                  ? 'text-emerald-400'
                  : repo.status === 'failed'
                  ? 'text-red-400'
                  : 'animate-pulse-soft text-cyan-300'
              }`}
            />
            <span className="truncate font-mono text-[11px] text-slate-300">
              <span className="text-slate-500">{repo.owner}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span className="font-semibold text-white">{repo.name}</span>
            </span>
            <span className="hidden items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-slate-400 lg:inline-flex">
              <GitBranch className="h-2.5 w-2.5" />
              {repo.defaultBranch}
            </span>
          </div>
        ) : (
          <span className="hidden items-center gap-1.5 border-l border-white/10 pl-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600 md:flex">
            Workspace idle
          </span>
        )}

        <div className="flex-1" />

        {/* View mode segmented control */}
        {repo && (
          <div
            role="tablist"
            aria-label="Graph view mode"
            className="relative hidden shrink-0 items-center rounded-xl border border-white/[0.06] bg-black/40 p-1 md:flex"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-1 w-[82px] rounded-lg bg-white/[0.08] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_20px_-14px_rgba(0,0,0,1)] ring-1 ring-inset ring-cyan-300/20 transition-transform duration-300 ease-smooth"
              style={{ transform: `translateX(${activeIndex * 82}px)` }}
            />
            {VIEW_MODES.map((mode) => {
              const active = mode.id === graphViewMode;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  role="tab"
                  aria-selected={active}
                  title={mode.hint}
                  onClick={() => setGraphViewMode(mode.id)}
                  className={`relative z-10 flex w-[82px] items-center justify-center gap-1.5 rounded-lg py-1.5 font-mono text-[10px] font-medium transition-colors duration-200 ${
                    active ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{mode.short}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {repo && onToggleIntelligence && (
            <button
              onClick={onToggleIntelligence}
              aria-pressed={showIntelligence}
              className={`btn ${
                showIntelligence
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                  : ''
              }`}
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Intelligence</span>
            </button>
          )}

          <button onClick={onNewAnalysis} className="btn">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{repo ? 'New analysis' : 'New'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
