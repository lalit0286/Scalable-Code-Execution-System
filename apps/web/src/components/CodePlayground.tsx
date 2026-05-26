'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import type { Language } from '@code-exec/shared';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { StatusBadge } from './StatusBadge';
import { TerminalOutput } from './TerminalOutput';
import { LanguageSelector } from './LanguageSelector';

// Monaco must be dynamically imported (no SSR)
const CodeEditor = dynamic(
  () => import('./CodeEditor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] border border-terminal-border rounded-b-lg bg-terminal-surface flex items-center justify-center">
        <span className="text-terminal-muted font-mono text-sm animate-pulse">Loading editor...</span>
      </div>
    ),
  },
);

const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// JavaScript — Node.js 20
const greet = (name) => {
  const message = \`Hello, \${name}!\`;
  console.log(message);
  return message;
};

const result = greet('World');
console.log(\`Returned: \${result}\`);`,

  python: `# Python 3.11
def greet(name: str) -> str:
    message = f"Hello, {name}!"
    print(message)
    return message

result = greet("World")
print(f"Returned: {result}")`,
};

// Stable user ID for demo (in production, use auth)
const DEMO_USER_ID = 'demo-user-001';

export function CodePlayground() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState(DEFAULT_CODE.javascript);

  const { state, isSubmitting, submitError, run, reset } = useCodeExecution(DEMO_USER_ID);

  const isActive = isSubmitting || state.status === 'queued' || state.status === 'running';

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      setLanguage(lang);
      setCode(DEFAULT_CODE[lang]);
      reset();
    },
    [reset],
  );

  const handleRun = useCallback(async () => {
    if (!code.trim()) return;
    await run(language, code);
  }, [run, language, code]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    },
    [handleRun],
  );

  return (
    <div
      className="flex flex-col gap-4 w-full max-w-5xl mx-auto"
      onKeyDown={handleKeyDown}
    >
      {/* Editor panel */}
      <div className="rounded-lg border border-terminal-border overflow-hidden shadow-xl shadow-black/40">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-terminal-surface border-b border-terminal-border flex-wrap">
          <LanguageSelector
            selected={language}
            onChange={handleLanguageChange}
            disabled={isActive}
          />

          <div className="flex items-center gap-2 ml-auto">
            {state.status && <StatusBadge status={state.status} />}

            <button
              onClick={handleRun}
              disabled={isActive || !code.trim()}
              className={clsx(
                'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold',
                'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-terminal-blue/50',
                isActive || !code.trim()
                  ? 'bg-terminal-border text-terminal-muted cursor-not-allowed'
                  : 'bg-terminal-blue text-white hover:bg-blue-500 active:scale-95',
              )}
            >
              {isActive ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hint bar */}
        <div className="px-4 py-1.5 bg-terminal-surface/50 border-b border-terminal-border">
          <p className="text-xs text-terminal-muted font-mono">
            Press{' '}
            <kbd className="px-1 py-0.5 bg-terminal-border rounded text-terminal-text/70 text-[10px]">
              ⌘ Enter
            </kbd>{' '}
            to run &nbsp;·&nbsp; Timeout: 5s &nbsp;·&nbsp; Memory: 128MB
          </p>
        </div>

        {/* Monaco editor */}
        <CodeEditor
          language={language}
          value={code}
          onChange={setCode}
          disabled={isActive}
        />
      </div>

      {/* Output panel */}
      <div className="animate-slide-up">
        {submitError && (
          <div className="mb-3 px-4 py-2.5 bg-terminal-red/10 border border-terminal-red/30 rounded-lg">
            <p className="text-terminal-red text-sm font-mono">✖ {submitError}</p>
          </div>
        )}

        <TerminalOutput
          status={state.status}
          output={state.output}
          stderr={state.stderr}
          error={state.error}
          execution_time_ms={state.execution_time_ms}
        />

        {state.execution_id && (
          <p className="mt-2 text-xs text-terminal-muted font-mono text-right">
            ID: {state.execution_id}
          </p>
        )}
      </div>
    </div>
  );
}
