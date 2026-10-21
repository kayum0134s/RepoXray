'use client';

import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROUPS: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    title: 'Viewport',
    items: [
      { keys: ['F'], label: 'Fit graph to viewport' },
      { keys: ['R'], label: 'Re-run layout' },
      { keys: ['+', '−'], label: 'Zoom in / out' },
    ],
  },
  {
    title: 'Navigate',
    items: [
      { keys: ['/'], label: 'Focus search' },
      { keys: ['Esc'], label: 'Clear selection' },
      { keys: ['?'], label: 'Toggle this panel' },
    ],
  },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-base/70 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-surface/95 shadow-float outline-none"
      >
        <div className="flex items-center justify-between border-b border-white/[0.055] px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Shortcuts
            </span>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close shortcuts">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <p className="label-xs mb-2">{group.title}</p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="text-[12px] text-slate-300">{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((key) => (
                        <kbd key={key} className="kbd">
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-white/[0.055] bg-black/20 px-4 py-2.5 text-center font-mono text-[9.5px] text-slate-600">
          Press <span className="text-slate-400">Esc</span> to close
        </div>
      </div>
    </div>
  );
}
