"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Code, Eye, FileText } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '@/types/db';

interface TemplateEditorProps {
  selectedTemplate: EmailTemplate | null;
  onUpdateTemplate: React.Dispatch<React.SetStateAction<EmailTemplate | null>>;
  onSave: (currentTemplate: EmailTemplate, detectedVariables: string[]) => void;
}

export function TemplateEditor({ selectedTemplate, onUpdateTemplate }: TemplateEditorProps) {
  const t = useTranslations('TemplatesPage');
  const [editorView, setEditorView] = useState<'code' | 'preview'>(
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'preview' : 'code'
  );
  if (!selectedTemplate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 glass-card rounded-xl">
        <FileText className="w-14 h-14 text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium text-muted-foreground">
          {t('noTemplateSelected')}
        </h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* 🧭 Capçalera amb inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder={t('templateNamePlaceholder')}
          value={selectedTemplate.name}
          onChange={(e) =>
            onUpdateTemplate((t) => (t ? { ...t, name: e.target.value } : null))
          }
        />
        <Input
          placeholder={t('subjectPlaceholder')}
          value={selectedTemplate.subject ?? ''}
          onChange={(e) =>
            onUpdateTemplate((t) => (t ? { ...t, subject: e.target.value } : null))
          }
        />
      </div>

      {/* 💻 Editor / Preview */}
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border overflow-hidden bg-card">
        {/* 🔹 Toolbar */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/40">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('contentTitle')}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant={editorView === 'code' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              title={t('codeButton')}
              onClick={() => setEditorView('code')}
            >
              <Code className="w-4 h-4" />
            </Button>
            <Button
              variant={editorView === 'preview' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              title={t('previewButton')}
              onClick={() => setEditorView('preview')}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ✏️ Cos de l’editor o vista prèvia */}
        <div className="flex-1 min-h-0 overflow-auto bg-background relative">
          {editorView === 'code' ? (
            <div className="h-full overflow-auto">
              <Editor
                value={selectedTemplate.body || ''}
                onValueChange={(code) =>
                  onUpdateTemplate((t) => (t ? { ...t, body: code } : null))
                }
                highlight={(code) => highlight(code, languages.markup!, 'markup')}
                padding={16}
                className="font-mono text-sm min-h-full outline-none"
                style={{
                  backgroundColor: '#1e1e1e',
                  color: '#dcdcdc',
                  fontFamily: '"Fira Code", monospace',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflow: 'auto',
                }}
              />
            </div>
          ) : (
            <iframe
              srcDoc={selectedTemplate.body ?? undefined}
              title={t('previewTitle')}
              className="w-full h-full border-0 bg-white"
            />
          )}
        </div>

      </div>
    </div>
  );
}
