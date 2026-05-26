'use client';

import clsx from 'clsx';
import type { ExecutionStatus } from '@code-exec/shared';

interface TerminalOutputProps {
  status: ExecutionStatus | null;
  output: string | null;
  stderr: string | null;
  error: string | null;
  execution_time_ms: number | null;
}

export function TerminalOutput({
  status,
  output,
  stderr,
  error,
  execution_time_ms,
}: TerminalOutputProps) {
  const isRunning = status === 'running' || status === 'queued';
  const hasOutput = output || stderr || error;

  return (
    <div className="terminal-output rounded-lg overflow-hidden">
      {/* Terminal chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-terminal-surface border-b border-terminal-border">
        <span className="w-3 h-3 rounded-full bg-terminal-red/60" />
        <span className="w-3 h-3 rounded-full bg-terminal-yellow/60" />
        <span className="w-3 h-3 rounded-full bg-terminal-green/60" />
        <span className="ml-3 text-xs text-terminal-muted font-mono">Output</span>
        {execution_time_ms !== null && (
          <span className="ml-auto text-xs text-terminal-muted font-mono">
            {execution_time_ms}ms
          </span>
        )}
      </div>

      {/* Output area */}
      <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-sm leading-relaxed">
        {/* Idle state */}
        {!status && (
          <p className="text-terminal-muted italic">
            Run your code to see output here...
          </p>
        )}

        {/* Queued */}
        {status === 'queued' && (
          <p className="text-terminal-yellow">
            <span className="status-pulse inline-block">⏳</span>{' '}
            Waiting in queue...
          </p>
        )}

        {/* Running */}
        {status === 'running' && !hasOutput && (
          <p className="text-terminal-blue cursor-blink">
            Executing
          </p>
        )}

        {/* stdout */}
        {output && (
          <div className="mb-2">
            {output.split('\n').map((line, i) => (
              <div
                key={i}
                className={clsx(
                  'whitespace-pre-wrap break-all',
                  status === 'completed' ? 'text-terminal-text' : 'text-terminal-text/80',
                )}
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        )}

        {/* stderr */}
        {stderr && (
          <div className="mt-2 pt-2 border-t border-terminal-border/50">
            <p className="text-xs text-terminal-muted mb-1 uppercase tracking-wide">stderr</p>
            {stderr.split('\n').map((line, i) => (
              <div key={i} className="text-terminal-red whitespace-pre-wrap break-all">
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        )}

        {/* Infrastructure/submission error */}
        {error && !stderr && (
          <p className="text-terminal-red">
            ✖ {error}
          </p>
        )}

        {/* Timeout message */}
        {status === 'timeout' && (
          <p className="text-terminal-red mt-2">
            ⏱ Execution timed out after 5 seconds.
          </p>
        )}

        {/* Running with partial output */}
        {status === 'running' && hasOutput && (
          <span className="text-terminal-blue cursor-blink ml-1" />
        )}
      </div>
    </div>
  );
}
