export type NodeCategory =
  | 'FOLDER'
  | 'FILE'
  | 'COMPONENT'
  | 'API'
  | 'MODEL'
  | 'DATABASE'
  | 'TEST'
  | 'CONFIG'
  | 'DEPENDENCY';

export interface NodeTheme {
  color: string;
  borderColor: string;
  badge: string;
  label: string;
}

export const NODE_THEMES: Record<string, NodeTheme> = {
  Python: { color: '#3572A5', borderColor: '#60a5fa', badge: 'PY', label: 'Python' },
  TypeScript: { color: '#3178c6', borderColor: '#38bdf8', badge: 'TS', label: 'TypeScript' },
  TSX: { color: '#0284c7', borderColor: '#38bdf8', badge: 'TSX', label: 'React TSX' },
  JavaScript: { color: '#d97706', borderColor: '#fbbf24', badge: 'JS', label: 'JavaScript' },
  JSX: { color: '#b45309', borderColor: '#fbbf24', badge: 'JSX', label: 'React JSX' },
  C: { color: '#db2777', borderColor: '#f472b6', badge: 'C', label: 'C Language' },
  'C++': { color: '#be185d', borderColor: '#f472b6', badge: 'CPP', label: 'C++' },
  Go: { color: '#0d9488', borderColor: '#2dd4bf', badge: 'GO', label: 'Go' },
  Rust: { color: '#ea580c', borderColor: '#fb923c', badge: 'RS', label: 'Rust' },
  JSON: { color: '#7c3aed', borderColor: '#c084fc', badge: 'JSON', label: 'JSON Config' },
  YAML: { color: '#9333ea', borderColor: '#c084fc', badge: 'YAML', label: 'YAML Config' },
  Markdown: { color: '#475569', borderColor: '#94a3b8', badge: 'MD', label: 'Documentation' },
  FOLDER: { color: '#475569', borderColor: '#64748b', badge: 'DIR', label: 'Directory' },
  DEFAULT: { color: '#0284c7', borderColor: '#38bdf8', badge: 'FILE', label: 'File' },
};

export function getNodeTheme(language?: string, type?: string, path?: string): NodeTheme {
  if (type === 'FOLDER' || type === 'directory') {
    return NODE_THEMES.FOLDER;
  }
  if (language && NODE_THEMES[language]) {
    return NODE_THEMES[language];
  }
  if (path) {
    if (path.includes('test') || path.includes('spec')) {
      return { color: '#16a34a', borderColor: '#4ade80', badge: 'TEST', label: 'Test File' };
    }
    if (path.includes('config') || path.endsWith('.json') || path.endsWith('.yaml') || path.endsWith('.yml')) {
      return NODE_THEMES.YAML;
    }
    if (path.includes('api') || path.includes('router') || path.includes('routes')) {
      return { color: '#06b6d4', borderColor: '#67e8f9', badge: 'API', label: 'API Endpoint' };
    }
    if (path.includes('model') || path.includes('schema') || path.includes('db')) {
      return { color: '#059669', borderColor: '#34d399', badge: 'DB', label: 'Data Model' };
    }
  }
  return NODE_THEMES.DEFAULT;
}

export function calculateNodeSize(totalDegree: number = 0, lineCount: number = 0): number {
  const degreeFactor = Math.min(totalDegree * 5, 30);
  const lineFactor = Math.min(Math.floor(lineCount / 50) * 2, 20);
  return Math.max(26, Math.min(80, 32 + degreeFactor + lineFactor));
}
