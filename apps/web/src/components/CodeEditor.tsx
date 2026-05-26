'use client';

import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Language } from '@code-exec/shared';

interface CodeEditorProps {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
};

export function CodeEditor({ language, value, onChange, disabled }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Focus editor on mount
    editor.focus();
  };

  return (
    <div className="h-[400px] border border-terminal-border rounded-b-lg overflow-hidden">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE_MAP[language]}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          formatOnPaste: true,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly: disabled,
          padding: { top: 16, bottom: 16 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
      />
    </div>
  );
}
