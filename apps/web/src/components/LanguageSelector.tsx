'use client';

import clsx from 'clsx';
import type { Language } from '@code-exec/shared';

interface LanguageSelectorProps {
  selected: Language;
  onChange: (lang: Language) => void;
  disabled?: boolean;
}

const LANGUAGES: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'python', label: 'Python', icon: 'PY' },
];

export function LanguageSelector({ selected, onChange, disabled }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-terminal-surface border border-terminal-border rounded-lg p-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          onClick={() => onChange(lang.value)}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            selected === lang.value
              ? 'bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/30'
              : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-border/40',
          )}
        >
          <span className="font-mono text-xs font-bold">{lang.icon}</span>
          {lang.label}
        </button>
      ))}
    </div>
  );
}
