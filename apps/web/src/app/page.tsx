import { CodePlayground } from '@/components/CodePlayground';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-terminal-blue/20 border border-terminal-blue/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-terminal-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="font-semibold text-terminal-text tracking-tight">
              Code<span className="text-terminal-blue">Guru</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            <span className="text-xs text-terminal-muted font-mono">Sandbox Ready</span>
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs text-terminal-muted font-mono">
            <span className="hidden md:block">Node 20 · Python 3.11</span>
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-terminal-text transition-colors"
            >
              Health ↗
            </a>
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Intro */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-terminal-text mb-2">
              Secure Code Execution
            </h1>
            <p className="text-terminal-muted text-sm leading-relaxed max-w-2xl">
              Run JavaScript and Python in fully isolated Docker containers with real-time output.
              Each execution gets its own ephemeral sandbox — no network, no filesystem access, 5s timeout.
            </p>
          </div>

          {/* Editor + Output */}
          <CodePlayground />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-terminal-border bg-terminal-surface/40 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-terminal-muted font-mono">
          <span>Scalable Code Execution · BullMQ + Redis + Docker</span>
          <span className="hidden sm:block">Designed for 1000+ concurrent users</span>
        </div>
      </footer>
    </main>
  );
}
