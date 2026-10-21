'use client';

import React from 'react';
import { RotateCcw, Languages, Boxes, Folder } from 'lucide-react';

export interface FilterState {
  languages: string[];
  nodeTypes: string[];
  relationshipTypes: string[];
  directories: string[];
}

interface FilterPanelProps {
  availableLanguages: string[];
  availableDirectories: string[];
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#4b8bbe',
  TypeScript: '#4f9cf0',
  TSX: '#4f9cf0',
  JavaScript: '#e8c547',
  JSX: '#e8c547',
  Go: '#2dd4bf',
  Rust: '#fb923c',
  C: '#94a3b8',
  'C++': '#f472b6',
  JSON: '#a78bfa',
  YAML: '#f87171',
  Markdown: '#94a3b8',
  Shell: '#34d399',
};

const NODE_CATEGORIES = ['Files', 'Folders', 'Tests', 'Config'];

export default function FilterPanel({
  availableLanguages,
  availableDirectories,
  filters,
  onFilterChange,
}: FilterPanelProps) {
  const toggle = (key: keyof FilterState, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: next });
  };

  const reset = () =>
    onFilterChange({ languages: [], nodeTypes: [], relationshipTypes: [], directories: [] });

  const activeCount =
    filters.languages.length + filters.nodeTypes.length + filters.directories.length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
          Visibility
        </span>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 rounded px-1 font-mono text-[9px] text-cyan-300/80 transition-colors hover:text-cyan-200"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {availableLanguages.length > 0 && (
          <section>
            <div className="mb-1 flex items-center gap-1">
              <Languages className="h-2.5 w-2.5 text-cyan-400/60" />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-slate-600">
                Language
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {availableLanguages.map((lang) => {
                const active = filters.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={() => toggle('languages', lang)}
                    aria-pressed={active}
                    className={`chip ${active ? 'chip-active' : ''}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: LANGUAGE_COLORS[lang] || '#64748b' }}
                    />
                    {lang}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="mb-1 flex items-center gap-1">
            <Boxes className="h-2.5 w-2.5 text-indigo-400/60" />
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-slate-600">
              Category
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {NODE_CATEGORIES.map((type) => {
              const active = filters.nodeTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggle('nodeTypes', type)}
                  aria-pressed={active}
                  className={`chip ${active ? 'chip-active' : ''}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </section>

        {availableDirectories.length > 0 && (
          <section>
            <div className="mb-1 flex items-center gap-1">
              <Folder className="h-2.5 w-2.5 text-emerald-400/60" />
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-slate-600">
                Directory
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {availableDirectories.slice(0, 8).map((dir) => {
                const active = filters.directories.includes(dir);
                return (
                  <button
                    key={dir}
                    onClick={() => toggle('directories', dir)}
                    aria-pressed={active}
                    className={`chip ${active ? 'chip-active' : ''}`}
                  >
                    {dir}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
