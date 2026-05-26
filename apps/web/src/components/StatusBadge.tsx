'use client';

import clsx from 'clsx';
import type { ExecutionStatus } from '@code-exec/shared';

interface StatusBadgeProps {
  status: ExecutionStatus | null;
}

const STATUS_CONFIG: Record<
  ExecutionStatus,
  { label: string; dotColor: string; textColor: string; bgColor: string; pulse: boolean }
> = {
  queued: {
    label: 'Queued...',
    dotColor: 'bg-terminal-yellow',
    textColor: 'text-terminal-yellow',
    bgColor: 'bg-terminal-yellow/10',
    pulse: true,
  },
  running: {
    label: 'Running...',
    dotColor: 'bg-terminal-blue',
    textColor: 'text-terminal-blue',
    bgColor: 'bg-terminal-blue/10',
    pulse: true,
  },
  completed: {
    label: 'Completed',
    dotColor: 'bg-terminal-green',
    textColor: 'text-terminal-green',
    bgColor: 'bg-terminal-green/10',
    pulse: false,
  },
  failed: {
    label: 'Failed',
    dotColor: 'bg-terminal-red',
    textColor: 'text-terminal-red',
    bgColor: 'bg-terminal-red/10',
    pulse: false,
  },
  timeout: {
    label: 'Timed Out',
    dotColor: 'bg-terminal-red',
    textColor: 'text-terminal-red',
    bgColor: 'bg-terminal-red/10',
    pulse: false,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium',
        config.bgColor,
        config.textColor,
        'border border-current/20',
        'animate-fade-in',
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full',
          config.dotColor,
          config.pulse && 'status-pulse',
        )}
      />
      {config.label}
    </span>
  );
}
