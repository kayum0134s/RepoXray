'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GraphData } from '@/types/graph';
import { FileItem } from '@/types/repository';
import { Search, X, FileCode2, Folder, CornerDownLeft, SearchX } from 'lucide-react';

interface SearchPanelProps {
  graphData: GraphData | null;
  files: FileItem[];
  onSelectResult: (nodeId: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

interface SearchResult {
  id: string;
  label: string;
  path: string;
  type: 'file' | 'folder';
  detail?: string;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-cyan-300/20 px-0.5 text-cyan-100">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchPanel({
  graphData,
  files,
  onSelectResult,
  inputRef,
}: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 160);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return [];

    const matches: SearchResult[] = [];
    const seen = new Set<string>();

    files.forEach((f) => {
      if (seen.has(f.id)) return;
      if (f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)) {
        seen.add(f.id);
        matches.push({
          id: f.id,
          label: f.name,
          path: f.path,
          type: 'file',
          detail: f.language || f.extension,
        });
      }
    });

    (graphData?.nodes || []).forEach((n) => {
      if (seen.has(n.id)) return;
      const isFolder = (n.type as string) === 'FOLDER' || (n.type as string) === 'directory';
      if (n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)) {
        seen.add(n.id);
        matches.push({
          id: n.id,
          label: n.label,
          path: n.path,
          type: isFolder ? 'folder' : 'file',
          detail: isFolder ? 'folder' : n.language,
        });
      }
    });

    return matches.slice(0, 10);
  }, [debouncedQuery, files, graphData]);

  useEffect(() => {
    setIsOpen(Boolean(debouncedQuery.trim()) && results.length > 0);
    setActiveIndex(0);
  }, [debouncedQuery, results.length]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSelect = (id: string) => {
    onSelectResult(id);
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      (e.target as HTMLInputElement).blur();
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex].id);
    }
  };

  const showEmpty = debouncedQuery.trim().length > 0 && results.length === 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input */}
      <div className="group relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-600 transition-colors group-focus-within:text-cyan-300" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => debouncedQuery.trim() && results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search files and paths"
          aria-label="Search repository files"
          className="field py-[7px] pl-8 pr-14"
        />
        {query.length > 0 ? (
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              setIsOpen(false);
            }}
            className="absolute right-1.5 grid h-5 w-5 place-items-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="kbd absolute right-1.5 h-4 min-w-4 border-white/[0.06] bg-white/[0.03] px-1 text-[9px] text-slate-600">
            /
          </kbd>
        )}
      </div>

      {/* Results */}
      {isOpen && (
        <div className="animate-scale-in absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#080d16]/95 shadow-float backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.055] px-2.5 py-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
              {results.length} match{results.length === 1 ? '' : 'es'}
            </span>
            <span className="font-mono text-[9px] text-slate-700">↑↓ navigate · ⏎ open</span>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {results.map((res, i) => (
              <button
                key={`${res.type}-${res.id}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(res.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-white/[0.06]' : ''
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                    res.type === 'folder'
                      ? 'border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300'
                      : 'border-white/[0.06] bg-white/[0.03] text-slate-400'
                  }`}
                >
                  {res.type === 'folder' ? (
                    <Folder className="h-3 w-3" />
                  ) : (
                    <FileCode2 className="h-3 w-3" />
                  )}
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-mono text-[11px] text-slate-200">
                    <Highlight text={res.label} query={debouncedQuery.trim()} />
                  </span>
                  <span className="truncate font-mono text-[9.5px] text-slate-600">
                    <Highlight text={res.path} query={debouncedQuery.trim()} />
                  </span>
                </span>

                {res.detail && (
                  <span className="shrink-0 rounded border border-white/[0.05] bg-white/[0.03] px-1 py-px font-mono text-[8.5px] uppercase text-slate-500">
                    {res.detail}
                  </span>
                )}

                {i === activeIndex && (
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-slate-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {showEmpty && (
        <div className="animate-scale-in absolute left-0 right-0 top-full z-50 mt-1.5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#080d16]/95 px-3 py-3 shadow-float backdrop-blur-2xl">
          <SearchX className="h-3.5 w-3.5 text-slate-600" />
          <p className="font-mono text-[10px] text-slate-500">
            No files match <span className="text-slate-300">“{debouncedQuery}”</span>
          </p>
        </div>
      )}
    </div>
  );
}
