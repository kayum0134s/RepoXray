'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchFileContent } from '@/lib/api';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  X,
  Copy,
  Check,
  Search,
  FileCode2,
  TriangleAlert,
  Loader2,
  Hash,
  CornerDownLeft,
} from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  repoId?: string;
  fileId?: string;
  filePath?: string;
  onClose: () => void;
}

export default function FilePreviewModal({
  isOpen,
  repoId,
  fileId,
  filePath,
  onClose,
}: FilePreviewModalProps) {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('');
  const [lineCount, setLineCount] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(isOpen, dialogRef);

  /* Load content ----------------------------------------------------- */
  useEffect(() => {
    if (!isOpen || !repoId || !fileId) return;

    let cancelled = false;
    setLoading(true);
    setSearchQuery('');
    setCopied(false);

    fetchFileContent(repoId, fileId)
      .then((data) => {
        if (cancelled) return;
        setContent(data.content);
        setLanguage(data.language || 'Plain text');
        setLineCount(data.line_count || 0);
        setTruncated(Boolean(data.truncated));
      })
      .catch((err) => {
        console.error('Failed to load file content:', err);
        if (!cancelled) setContent('// Failed to load source file content.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, repoId, fileId]);

  /* Modal behaviour -------------------------------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const lines = useMemo(() => content.split('\n'), [content]);
  const query = searchQuery.trim().toLowerCase();
  const matchCount = useMemo(
    () => (query ? lines.filter((l) => l.toLowerCase().includes(query)).length : 0),
    [lines, query]
  );

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Clipboard unavailable:', err);
    }
  };

  const pathParts = (filePath || '').split('/').filter(Boolean);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-base/80 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Source preview for ${filePath || 'file'}`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060a11] shadow-float outline-none"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-white/[0.06] bg-surface/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
              <FileCode2 className="h-3 w-3" />
            </span>
            <div className="flex min-w-0 items-center gap-0.5 font-mono text-[10.5px]">
              {pathParts.map((part, i) => (
                <React.Fragment key={`${part}-${i}`}>
                  {i > 0 && <span className="px-0.5 text-slate-700">/</span>}
                  <span
                    className={`truncate ${
                      i === pathParts.length - 1 ? 'font-semibold text-cyan-200' : 'text-slate-500'
                    }`}
                  >
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </div>
            {language && (
              <span className="hidden shrink-0 rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-px font-mono text-[9px] text-slate-500 sm:inline">
                {language}
              </span>
            )}
            {lineCount > 0 && (
              <span className="hidden shrink-0 items-center gap-1 font-mono text-[9px] text-slate-600 md:flex">
                <Hash className="h-2.5 w-2.5" />
                {lineCount.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in file"
                aria-label="Find in file"
                className="field w-36 py-1.5 pl-7 pr-14 text-[10.5px] sm:w-48"
              />
              {query ? (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] tabular-nums text-cyan-300/80">
                  {matchCount}
                </span>
              ) : (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-700">
                  ⌘F
                </span>
              )}
            </div>

            <button onClick={handleCopy} className="btn h-[30px] px-2.5">
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="hidden text-emerald-300 sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>

            <button onClick={onClose} className="icon-btn" aria-label="Close preview">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Truncation banner */}
        {truncated && (
          <div className="flex shrink-0 items-center gap-2 border-b border-amber-400/15 bg-amber-400/[0.06] px-4 py-1.5">
            <TriangleAlert className="h-3 w-3 shrink-0 text-amber-400" />
            <p className="font-mono text-[9.5px] text-amber-200/80">
              File exceeds 2,000 lines — truncated for viewer performance.
            </p>
          </div>
        )}

        {/* Code */}
        <div className="relative min-h-0 flex-1 overflow-auto bg-[#05080e]">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300/70">
                Loading source
              </span>
            </div>
          ) : (
            <div className="min-w-max py-2 font-mono text-[11.5px] leading-[1.7]">
              {lines.map((line, idx) => {
                const isMatch = Boolean(query) && line.toLowerCase().includes(query);
                return (
                  <div
                    key={idx}
                    className={`flex items-start transition-colors ${
                      isMatch ? 'bg-amber-300/[0.07]' : 'hover:bg-white/[0.025]'
                    }`}
                  >
                    <span
                      className={`sticky left-0 z-[1] w-12 shrink-0 select-none border-r border-white/[0.04] pr-3 text-right text-[10px] tabular-nums ${
                        isMatch ? 'bg-[#0d1220] text-amber-300/70' : 'bg-[#05080e] text-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <pre
                      className={`flex-1 whitespace-pre px-3 ${
                        isMatch ? 'text-amber-100/90' : 'text-slate-300'
                      }`}
                    >
                      {line === '' ? ' ' : line}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && query && matchCount > 0 && (
            <div className="pointer-events-none sticky bottom-2 left-0 z-10 ml-3 inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-base/90 px-2 py-1 font-mono text-[9.5px] text-slate-400 backdrop-blur">
              <CornerDownLeft className="h-2.5 w-2.5 text-cyan-300" />
              {matchCount} matching line{matchCount === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-surface/50 px-4 py-1.5 font-mono text-[9px] text-slate-600">
          <span className="truncate">{filePath}</span>
          <span className="shrink-0 pl-3">{lineCount.toLocaleString()} lines</span>
        </div>
      </div>
    </div>
  );
}
