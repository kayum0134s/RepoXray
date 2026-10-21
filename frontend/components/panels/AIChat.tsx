'use client';

import React, { useEffect, useRef, useState } from 'react';
import { queryAI, explainRepositoryAI } from '@/lib/api';
import {
  Sparkles,
  ArrowUp,
  Bot,
  Shield,
  Database,
  Zap,
  CircleHelp,
  ShieldCheck,
} from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface AIChatProps {
  repoId?: string;
  selectedFilePath?: string;
  initialPrompt?: string;
}

/* ------------------------------------------------------------------ */
/* Minimal, safe markdown-lite renderer                                */
/* ------------------------------------------------------------------ */
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded border border-white/[0.07] bg-white/[0.05] px-1 py-px font-mono text-[10px] text-cyan-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>;
  });
}

function MessageBody({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) return null;

        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5 pl-0.5">
              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-cyan-300/60" />
              <span className="min-w-0">{renderInline(trimmed.replace(/^[-*•]\s+/, ''), `l${i}`)}</span>
            </div>
          );
        }

        if (/^#{1,3}\s+/.test(trimmed)) {
          return (
            <p key={i} className="mt-0.5 font-semibold text-slate-100">
              {renderInline(trimmed.replace(/^#{1,3}\s+/, ''), `h${i}`)}
            </p>
          );
        }

        return <p key={i}>{renderInline(line, `p${i}`)}</p>;
      })}
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: 'repository', label: 'Explain repo', icon: Sparkles, tone: 'text-cyan-300' },
  { id: 'impact', label: 'Impact', icon: Zap, tone: 'text-amber-300' },
  { id: 'auth_flow', label: 'Auth flow', icon: Shield, tone: 'text-indigo-300' },
  { id: 'db_flow', label: 'DB flow', icon: Database, tone: 'text-emerald-300' },
];

export default function AIChat({ repoId, selectedFilePath }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'I read this repository **structurally** — imports, symbols and graph edges.\nAsk me about architecture, dependency impact or where a flow lives.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (queryText?: string) => {
    const text = (queryText ?? input).trim();
    if (!text || !repoId || loading) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await queryAI(repoId, text);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.answer || 'No answer returned.' }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '⚠️ **Copilot offline** — the AI engine could not be reached. Verify the backend connection.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runQuickAction = async (target: string) => {
    if (!repoId || loading) return;

    let label = 'Explain this repository';
    if (target === 'impact' && selectedFilePath) label = `What breaks if I change ${selectedFilePath}?`;
    else if (target === 'auth_flow') label = 'Where is the authentication flow?';
    else if (target === 'db_flow') label = 'Where is the database layer?';

    setMessages((prev) => [...prev, { sender: 'user', text: label }]);
    setLoading(true);

    try {
      const res = await explainRepositoryAI(repoId, target, selectedFilePath);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.answer || 'No answer returned.' }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '⚠️ **Evidence fallback active** — showing static analysis only.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const disabled = !repoId || loading;

  return (
    <section className="panel flex w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.055] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-cyan-300/25 to-indigo-400/20 text-cyan-200">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Copilot
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 font-mono text-[8.5px] text-emerald-300/90">
          <ShieldCheck className="h-2.5 w-2.5" />
          grounded
        </span>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex max-h-[300px] min-h-[148px] flex-1 flex-col gap-2.5 overflow-y-auto p-3"
      >
        {messages.map((msg, i) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={i}
              className={`animate-fade-up flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  isUser
                    ? 'border-white/[0.08] bg-white/[0.04] text-slate-400'
                    : 'border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300'
                }`}
              >
                {isUser ? <CircleHelp className="h-2.5 w-2.5" /> : <Bot className="h-2.5 w-2.5" />}
              </span>

              <div
                className={`min-w-0 max-w-[88%] rounded-xl px-2.5 py-2 text-[11px] leading-relaxed ${
                  isUser
                    ? 'rounded-tr-sm border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-50/90'
                    : 'rounded-tl-sm border border-white/[0.05] bg-black/30 text-slate-400'
                }`}
              >
                <MessageBody text={msg.text} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 pl-7">
            <span className="flex items-center gap-1 rounded-lg border border-white/[0.05] bg-black/30 px-2.5 py-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
            <span className="font-mono text-[9px] text-slate-600">reading evidence</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex shrink-0 flex-wrap gap-1 px-3 pb-2">
        {QUICK_ACTIONS.filter((a) => a.id !== 'impact' || selectedFilePath).map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => runQuickAction(action.id)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-1.5 py-1 font-mono text-[9px] text-slate-400 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.05] hover:text-slate-200 disabled:opacity-40"
            >
              <Icon className={`h-2.5 w-2.5 ${action.tone}`} />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 border-t border-white/[0.055] p-2"
      >
        <div className="flex items-end gap-1.5 rounded-lg border border-white/[0.07] bg-black/35 p-1 transition-colors focus-within:border-cyan-400/40">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={repoId ? 'Ask about this codebase…' : 'Analyze a repository first'}
            disabled={disabled}
            className="max-h-20 min-h-[26px] flex-1 resize-none bg-transparent px-1.5 py-1 font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            aria-label="Send message"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-cyan-300 to-indigo-400 text-slate-950 transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" strokeWidth={2.6} />
          </button>
        </div>
      </form>
    </section>
  );
}
