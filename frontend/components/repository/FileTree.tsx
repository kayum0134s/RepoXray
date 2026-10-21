'use client';

import React, { useMemo, useState } from 'react';
import { FileItem } from '@/types/repository';
import { ChevronRight, FileCode2, Folder, FolderOpen, ChevronsDown, ChevronsUp, FileText } from 'lucide-react';

interface FileTreeProps {
  files: FileItem[];
  selectedFileId?: string;
  onSelectFile?: (file: FileItem) => void;
  searchQuery?: string;
  selectedLanguage?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  fileItem?: FileItem;
  children: Record<string, TreeNode>;
}

const LANGUAGE_DOTS: Record<string, string> = {
  Python: '#4b8bbe',
  TypeScript: '#4f9cf0',
  TSX: '#4f9cf0',
  JavaScript: '#e8c547',
  JSX: '#e8c547',
  JSON: '#a78bfa',
  YAML: '#f87171',
  Markdown: '#94a3b8',
  CSS: '#c084fc',
  HTML: '#fb923c',
  Shell: '#34d399',
  Go: '#2dd4bf',
  Rust: '#fb923c',
};

function buildRoot(files: FileItem[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          fileItem: isLast ? file : undefined,
          children: {},
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

function countFiles(node: TreeNode): number {
  if (!node.isFolder) return 1;
  return Object.values(node.children).reduce((sum, child) => sum + countFiles(child), 0);
}

function collectFolders(node: TreeNode, acc: Set<string>) {
  if (!node.isFolder || !node.path) return;
  acc.add(node.path);
  Object.values(node.children).forEach((child) => collectFolders(child, acc));
}

export default function FileTree({
  files,
  selectedFileId,
  onSelectFile,
  searchQuery = '',
  selectedLanguage = '',
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true });

  const filteredFiles = useMemo(
    () =>
      files.filter((f) => {
        const matchesSearch = !searchQuery || f.path.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLang = !selectedLanguage || f.language === selectedLanguage;
        return matchesSearch && matchesLang;
      }),
    [files, searchQuery, selectedLanguage]
  );

  const root = useMemo(() => buildRoot(filteredFiles), [filteredFiles]);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const expandAll = () => {
    const acc = new Set<string>();
    collectFolders(root, acc);
    const next: Record<string, boolean> = { '': true };
    acc.forEach((p) => (next[p] = true));
    setExpandedFolders(next);
  };

  const collapseAll = () => setExpandedFolders({ '': true });

  const renderTree = (node: TreeNode, depth = 0): React.ReactNode => {
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
      return a.isFolder ? -1 : 1;
    });

    return (
      <div key={node.path || 'root'} className="flex flex-col">
        {node.path !== '' && (
          <button
            onClick={(e) => {
              if (node.isFolder) toggleFolder(node.path, e);
              else if (node.fileItem) onSelectFile?.(node.fileItem);
            }}
            style={{ paddingLeft: `${depth * 11 + 8}px` }}
            className={`group relative flex w-full items-center gap-1.5 py-[3px] pr-2 text-left font-mono text-[11px] transition-colors duration-150 ${
              node.fileItem && node.fileItem.id === selectedFileId
                ? 'bg-cyan-300/[0.07] text-cyan-100'
                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
            }`}
            title={node.path}
          >
            {node.fileItem?.id === selectedFileId && (
              <span className="absolute inset-y-0 left-0 w-[2px] rounded-r bg-cyan-300" />
            )}

            {node.isFolder ? (
              <>
                <ChevronRight
                  className={`h-3 w-3 shrink-0 text-slate-600 transition-transform duration-200 ${
                    expandedFolders[node.path] ? 'rotate-90' : ''
                  }`}
                />
                {expandedFolders[node.path] ? (
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-cyan-300/70" />
                ) : (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                )}
                <span className="truncate text-slate-300 group-hover:text-white">{node.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-slate-600">
                  {countFiles(node)}
                </span>
              </>
            ) : (
              <>
                <span className="ml-3.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                  {node.fileItem?.language ? (
                    <span
                      className="h-1.5 w-1.5 rounded-[2px]"
                      style={{
                        backgroundColor:
                          LANGUAGE_DOTS[node.fileItem.language] || '#64748b',
                      }}
                    />
                  ) : (
                    <FileText className="h-3 w-3 text-slate-600" />
                  )}
                </span>
                <span className="truncate">{node.name}</span>
                {node.fileItem?.lineCount ? (
                  <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-slate-700">
                    {node.fileItem.lineCount}
                  </span>
                ) : null}
              </>
            )}
          </button>
        )}

        {node.path === '' || expandedFolders[node.path] ? (
          <div className="flex flex-col">
            {sortedChildren.map((child) => renderTree(child, node.path === '' ? depth : depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <FileCode2 className="h-6 w-6 text-slate-700" />
        <p className="font-mono text-[10px] text-slate-600">No files indexed yet</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tree toolbar */}
      <div className="flex shrink-0 items-center justify-between px-2 pb-1 pt-0.5">
        <span className="px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-700">
          {filteredFiles.length} files
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={expandAll} className="icon-btn h-5 w-5" title="Expand all folders">
            <ChevronsDown className="h-3 w-3" />
          </button>
          <button onClick={collapseAll} className="icon-btn h-5 w-5" title="Collapse all folders">
            <ChevronsUp className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2 [mask-image:linear-gradient(to_bottom,transparent,black_6px,black_calc(100%-10px),transparent)]">
        {renderTree(root)}
      </div>
    </div>
  );
}
