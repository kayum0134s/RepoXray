'use client';

import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitBranch,
  Braces,
  Radar,
  Fingerprint,
} from 'lucide-react';

interface RepositoryInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const DEMO_REPOSITORIES = [
  { label: 'pallets/markupsafe', url: 'https://github.com/pallets/markupsafe', desc: 'Python AST', color: '#3572A5' },
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express', desc: 'CommonJS', color: '#f1e05a' },
  { label: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', desc: 'Python API', color: '#3572A5' },
  { label: 'facebook/react', url: 'https://github.com/facebook/react', desc: 'JSX / TSX', color: '#61dafb' },
  { label: 'psf/requests', url: 'https://github.com/psf/requests', desc: 'Python lib', color: '#3572A5' },
];

const CAPABILITIES = [
  { icon: Braces, title: 'Static AST parsing', desc: 'Python, JS, TS, TSX, JSX' },
  { icon: Radar, title: 'Dependency graph', desc: 'Imports, cycles, hubs' },
  { icon: Fingerprint, title: 'Evidence-grounded AI', desc: 'No hallucinated edges' },
];

const NODES = [
  { x: 96, y: 148, r: 4 },
  { x: 214, y: 74, r: 6 },
  { x: 292, y: 178, r: 3.5 },
  { x: 388, y: 96, r: 5 },
  { x: 470, y: 196, r: 4 },
  { x: 560, y: 64, r: 3 },
  { x: 646, y: 150, r: 6 },
  { x: 742, y: 88, r: 3.5 },
  { x: 812, y: 208, r: 4.5 },
  { x: 158, y: 286, r: 3 },
  { x: 338, y: 314, r: 5},
  { x: 528, y: 300, r: 3.5 },
  { x: 690, y: 330, r: 4 },
  { x: 232, y: 402, r: 3.5 },
  { x: 452, y: 420, r: 5 },
  { x: 640, y: 438, r: 3 },
];

const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [5, 6], [6, 7], [6, 8],
  [0, 9], [2, 10], [4, 11], [6, 12], [9, 13], [10, 14], [11, 15],
  [10, 11], [14, 12],
];

function HeroConstellation() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 900 500"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]"
      style={{
        maskImage: 'radial-gradient(ellipse 65% 60% at 50% 42%, #000 10%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 60% at 50% 42%, #000 10%, transparent 75%)',
      }}
    >
      <defs>
        <linearGradient id="hero-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.11" />
          <stop offset="55%" stopColor="#818cf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.08" />
        </linearGradient>
        <radialGradient id="hero-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g stroke="url(#hero-edge)" strokeWidth="1" fill="none">
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            strokeDasharray="3 7"
            className="opacity-80"
            style={{
              animation: `dash ${9 + (i % 5) * 3}s linear infinite`,
              animationDirection: i % 2 ? 'reverse' : 'normal',
            }}
          />
        ))}
      </g>

      <g>
        {NODES.map((n, i) => (
          <g key={i} style={{ animation: `floaty ${7 + (i % 6)}s ease-in-out infinite`, animationDelay: `${-i * 0.6}s`, transformOrigin: `${n.x}px ${n.y}px` }}>
            <circle cx={n.x} cy={n.y} r={n.r * 4.5} fill="url(#hero-node)" opacity="0.16" />
            <circle cx={n.x} cy={n.y} r={n.r} fill="#67e8f9" opacity="0.9" />
          </g>
        ))}
      </g>

      <style>{`
        @keyframes dash { to { stroke-dashoffset: -120; } }
        @keyframes floaty {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
      `}</style>
    </svg>
  );
}

export default function RepositoryInput({ onSubmit, isLoading }: RepositoryInputProps) {
  const [url, setUrl] = useState('');
  const [attempted, setAttempted] = useState(false);

  const isValidGitHubUrl = (input: string) =>
    /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(input.trim());

  const isCurrentValid = isValidGitHubUrl(url);
  const showError = attempted && url.trim().length > 0 && !isCurrentValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (isCurrentValid) {
      onSubmit(url.trim());
    } else {
      setAttempted(true);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-10 md:pt-16">
      <HeroConstellation />

      <div className="relative flex w-full flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] py-1 pl-2 pr-3 text-[10px] font-medium text-cyan-200/90 backdrop-blur-md">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-cyan-400/15">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          </span>
          <span className="font-mono uppercase tracking-[0.18em]">Architecture engine v1.0</span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up mt-7 max-w-3xl text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl md:text-[4.4rem]"
          style={{ animationDelay: '60ms' }}
        >
          See inside
          <br className="sm:hidden" />{' '}
          <span className="text-gradient">any codebase.</span>
        </h1>

        <p
          className="animate-fade-up mt-6 max-w-xl text-[15px] leading-relaxed text-slate-400"
          style={{ animationDelay: '120ms' }}
        >
          Paste a GitHub URL. RepoXray parses every import, resolves the dependency
          graph, and renders an interactive map of how the software actually fits together.
        </p>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-up relative mt-10 w-full max-w-2xl"
          style={{ animationDelay: '180ms' }}
        >
          <div
            className={`group relative flex items-center gap-2 rounded-2xl border bg-black/50 p-2 backdrop-blur-xl transition-all duration-300 ease-smooth ${
              showError
                ? 'border-amber-400/50'
                : 'border-white/[0.08] hover:border-white/[0.14] focus-within:border-cyan-300/50'
            }`}
            style={{
              boxShadow: showError
                ? '0 0 0 4px rgba(251,191,36,0.06), 0 30px 60px -40px rgba(0,0,0,1)'
                : '0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 70px -45px rgba(0,0,0,1)',
            }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-focus-within:opacity-100"
              style={{ boxShadow: '0 0 60px -22px rgba(34,211,238,0.65)' }}
            />

            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.035] text-slate-500 transition-colors group-focus-within:text-cyan-300">
              <Search className="h-4 w-4" strokeWidth={2.2} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-start px-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
                Repository URL
              </span>
              <input
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (attempted) setAttempted(false);
                }}
                placeholder="https://github.com/owner/repo"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
                aria-label="GitHub repository URL"
                aria-invalid={showError}
                className="w-full bg-transparent py-0.5 font-mono text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none disabled:opacity-60"
              />
            </div>

            {url.length > 0 && (
              <span className="mr-1 hidden shrink-0 sm:block" aria-hidden>
                {isCurrentValid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className={`h-4 w-4 ${showError ? 'text-amber-400' : 'text-slate-600'}`} />
                )}
              </span>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary relative inline-flex h-10 shrink-0 items-center gap-2 overflow-hidden rounded-xl px-4 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-70 sm:px-5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analyzing</span>
                </>
              ) : (
                <>
                  <span>Analyze</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>

          <div className="mt-2.5 flex min-h-[18px] items-center justify-between px-1.5">
            <p
              className={`font-mono text-[10px] transition-colors ${
                showError ? 'text-amber-400' : 'text-slate-600'
              }`}
              role={showError ? 'alert' : undefined}
            >
              {showError
                ? 'Invalid target — expected https://github.com/owner/repo'
                : 'Public repositories only · no code is ever executed'}
            </p>
            <p className="hidden items-center gap-1 font-mono text-[10px] text-slate-600 sm:flex">
              <GitBranch className="h-3 w-3" />
              branches resolve automatically
            </p>
          </div>
        </form>

        {/* Demo chips */}
        <div
          className="animate-fade-up mt-8 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: '240ms' }}
        >
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
            Try
          </span>
          {DEMO_REPOSITORIES.map((demo) => (
            <button
              key={demo.label}
              onClick={() => {
                setUrl(demo.url);
                onSubmit(demo.url);
              }}
              disabled={isLoading}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] disabled:opacity-50"
            >
              <span
                className="h-1.5 w-1.5 rounded-full ring-2 ring-white/5"
                style={{ backgroundColor: demo.color }}
              />
              <span className="font-mono text-[11px] text-slate-300 transition-colors group-hover:text-white">
                {demo.label}
              </span>
              <span className="rounded bg-white/[0.05] px-1 py-px font-mono text-[9px] text-slate-500">
                {demo.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Capability strip */}
        <div
          className="animate-fade-up mt-16 grid w-full max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.055] bg-white/[0.04] sm:grid-cols-3"
          style={{ animationDelay: '300ms' }}
        >
          {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 bg-base/60 px-4 py-3.5 backdrop-blur-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-cyan-300">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="text-left">
                <p className="text-[12px] font-medium text-slate-200">{title}</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
