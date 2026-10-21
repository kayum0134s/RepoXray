import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RepoXray — See Inside Any Codebase',
  description:
    'Turn any GitHub repository into an interactive architectural map: dependency graphs, circular imports, layer inference and an evidence-grounded AI copilot.',
};

export const viewport: Viewport = {
  themeColor: '#04060b',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="relative min-h-screen bg-base text-slate-100 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-300 focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:font-semibold focus:text-slate-950 focus:outline-none"
        >
          Skip to content
        </a>

        {/* Ambient background field */}
        <div aria-hidden className="aurora-field">
          <div
            className="aurora-blob animate-drift"
            style={{
              top: '-22%',
              left: '8%',
              width: '52rem',
              height: '32rem',
              background:
                'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.30), rgba(34,211,238,0) 70%)',
            }}
          />
          <div
            className="aurora-blob animate-drift"
            style={{
              top: '-10%',
              right: '-6%',
              width: '46rem',
              height: '30rem',
              animationDelay: '-7s',
              background:
                'radial-gradient(circle at 50% 50%, rgba(129,140,248,0.26), rgba(129,140,248,0) 70%)',
            }}
          />
          <div
            className="aurora-blob animate-drift"
            style={{
              bottom: '-30%',
              left: '28%',
              width: '60rem',
              height: '28rem',
              animationDelay: '-12s',
              background:
                'radial-gradient(circle at 50% 50%, rgba(52,211,153,0.12), rgba(52,211,153,0) 72%)',
            }}
          />
          <div className="absolute inset-0 grid-overlay opacity-70" />
        </div>
        <div aria-hidden className="noise-layer" />

        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
