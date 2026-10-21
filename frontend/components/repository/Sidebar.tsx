'use client';

import React, { useMemo, useState } from 'react';
import { FileItem } from '@/types/repository';
import { GraphData } from '@/types/graph';
import FileTree from './FileTree';
import SearchPanel from '@/components/panels/SearchPanel';
import FilterPanel, { FilterState } from '@/components/panels/FilterPanel';
import { FolderTree, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface SidebarProps {
  files: FileItem[];
  graphData: GraphData | null;
  selectedFileId?: string;
  onSelectFile?: (file: FileItem) => void;
  onSelectNodeId?: (nodeId: string) => void;
  languageSummary?: Record<string, number>;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export default function Sidebar({
  files,
  graphData,
  selectedFileId,
  onSelectFile,
  onSelectNodeId,
  languageSummary = {},
  filters,
  onFilterChange,
  searchRef,
}: SidebarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const availableLanguages = useMemo(
    () => Object.keys(languageSummary).sort((a, b) => languageSummary[b] - languageSummary[a]),
    [languageSummary]
  );

  const availableDirectories = useMemo(() => {
    const dirs = new Set<string>();
    files.forEach((f) => {
      const parts = f.path.split('/');
      if (parts.length > 1) dirs.add(parts[0]);
    });
    return Array.from(dirs).sort();
  }, [files]);

  const activeFilterCount =
    filters.languages.length +
    filters.nodeTypes.length +
    filters.directories.length +
    filters.relationshipTypes.length;

  return (
    <aside className="panel flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.055] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <FolderTree className="h-3.5 w-3.5 text-cyan-300/90" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Explorer
          </span>
          <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1 py-px font-mono text-[9px] tabular-nums text-slate-500">
            {files.length.toLocaleString()}
          </span>
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`relative inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[9.5px] transition-all duration-200 ${
            showFilters || activeFilterCount > 0
              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
              : 'border-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'
          }`}
          title="Toggle graph visibility filters"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="grid h-3.5 min-w-3.5 place-items-center rounded-full bg-cyan-300 px-1 text-[8.5px] font-bold text-slate-950">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-2.5 w-2.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-2.5 py-2.5">
        <SearchPanel
          graphData={graphData}
          files={files}
          onSelectResult={(id) => onSelectNodeId?.(id)}
          inputRef={searchRef}
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-fade-up shrink-0 px-2.5 pb-2.5">
          <FilterPanel
            availableLanguages={availableLanguages}
            availableDirectories={availableDirectories}
            filters={filters}
            onFilterChange={onFilterChange}
          />
        </div>
      )}

      {/* Tree */}
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-surface to-transparent" />
        <div className="h-full overflow-hidden pt-0.5">
          <FileTree files={files} selectedFileId={selectedFileId} onSelectFile={onSelectFile} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.055] px-3 py-2 font-mono text-[9.5px] text-slate-600">
        <span>{availableLanguages.length} languages</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          indexed
        </span>
      </div>
    </aside>
  );
}
