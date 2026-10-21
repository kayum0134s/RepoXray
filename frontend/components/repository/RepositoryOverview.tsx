'use client';

import React from 'react';
import { Repository } from '@/types/repository';
import { ExternalLink, GitBranch, Files, CheckCircle2, Clock3, TriangleAlert, Github } from 'lucide-react';

interface RepositoryOverviewProps {
  repo: Repository | null;
}

const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  TSX: '#3178c6',
  JavaScript: '#f1e05a',
  JSX: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  JSON: '#29b6f6',
  YAML: '#cb171e',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  C: '#555555',
  'C++': '#f34b7d',
  Go: '#00ADD8',
  Rust: '#dea584',
  Markdown: '#083fa1',
  Unknown: '#6e7681',
};

export default function RepositoryOverview({ repo }: RepositoryOverviewProps) {
  if (!repo) return null;

  const langSummary = repo.languageSummary || {};
  const entries = Object.entries(langSummary).sort((a, b) => b[1] - a[1]);
  const totalLangFiles = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  const status = (() => {
    switch (repo.status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Analyzed',
          className: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300',
        };
      case 'failed':
        return {
          icon: TriangleAlert,
          label: 'Failed',
          className: 'border-red-400/25 bg-red-400/[0.08] text-red-300',
        };
      default:
        return {
          icon: Clock3,
          label: repo.status.replace(/_/g, ' '),
          className: 'border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-200',
        };
    }
  })();
  const StatusIcon = status.icon;

  return (
    <section className="animate-fade-up panel flex shrink-0 flex-col gap-3 px-3.5 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-4">
      {/* Identity */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.01]">
          <Github className="h-[18px] w-[18px] text-slate-200" strokeWidth={1.7} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-base bg-emerald-400" />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
              <span className="font-normal text-slate-500">{repo.owner}</span>
              <span className="mx-1 text-slate-600">/</span>
              {repo.name}
            </h1>

            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-medium capitalize ${status.className}`}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {status.label}
            </span>

            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="icon-btn h-5 w-5 shrink-0"
              title="Open repository on GitHub"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-2.5 w-2.5" />
              {repo.defaultBranch}
            </span>
            <span className="inline-flex items-center gap-1">
              <Files className="h-2.5 w-2.5" />
              {repo.fileCount.toLocaleString()} files
            </span>
            <span className="hidden sm:inline">
              {entries.length} language{entries.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Language spectrum */}
      {entries.length > 0 && (
        <div className="w-full shrink-0 md:w-[320px] lg:w-[380px]">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="label-xs">Composition</span>
            <span className="font-mono text-[9.5px] text-slate-600">
              {totalLangFiles.toLocaleString()} mapped
            </span>
          </div>

          <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-white/[0.04]">
            {entries.map(([lang, count], i) => (
              <span
                key={lang}
                className="h-full rounded-full transition-all duration-700 ease-smooth first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(count / totalLangFiles) * 100}%`,
                  minWidth: '3px',
                  backgroundColor: LANGUAGE_COLORS[lang] || '#6e7681',
                  opacity: i < 6 ? 1 : 0.45,
                  animationDelay: `${i * 60}ms`,
                }}
                title={`${lang}: ${count} file${count === 1 ? '' : 's'}`}
              />
            ))}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {entries.slice(0, 5).map(([lang, count]) => (
              <span key={lang} className="inline-flex items-center gap-1 font-mono text-[9.5px] text-slate-500">
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[lang] || '#6e7681' }}
                />
                {lang}
                <span className="text-slate-700">{Math.round((count / totalLangFiles) * 100)}%</span>
              </span>
            ))}
            {entries.length > 5 && (
              <span className="font-mono text-[9.5px] text-slate-700">+{entries.length - 5}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
