/**
 * @file TemplateEditor.tsx
 * @summary Renderitza la columna central amb els camps d'edició (nom, assumpte) i l'editor de codi/vista prèvia.
 */
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
import type { EmailTemplate } from '../page';

interface TemplateEditorProps {
    selectedTemplate: EmailTemplate | null;
    onUpdateTemplate: React.Dispatch<React.SetStateAction<EmailTemplate | null>>;
    onSave: (currentTemplate: EmailTemplate, detectedVariables: string[]) => void;
  }

export function TemplateEditor({ selectedTemplate, onUpdateTemplate }: TemplateEditorProps) {
  const t = useTranslations('TemplatesPage');
  const [editorView, setEditorView] = useState<'code' | 'preview'>('preview');

  if (!selectedTemplate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 glass-card rounded-xl">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">{t('noTemplateSelected')}</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          placeholder={t('templateNamePlaceholder')}
          value={selectedTemplate.name}
          onChange={(e) => onUpdateTemplate(t => t ? { ...t, name: e.target.value } : null)}
        />
        <Input
          placeholder={t('subjectPlaceholder')}
          value={selectedTemplate.subject}
          onChange={(e) => onUpdateTemplate(t => t ? { ...t, subject: e.target.value } : null)}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 glass-card rounded-xl overflow-hidden">
        <div className="p-2 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold px-2">{t('contentTitle')}</h3>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-black/20">
            <Button variant={editorView === 'code' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3" onClick={() => setEditorView('code')}>
              <Code className="w-4 h-4 mr-2"/>{t('codeButton')}
            </Button>
            <Button variant={editorView === 'preview' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3" onClick={() => setEditorView('preview')}>
              <Eye className="w-4 h-4 mr-2"/>{t('previewButton')}
            </Button>
          </div>
        </div>

        {editorView === 'code' ? (
          <div className="flex-1 overflow-y-auto font-mono text-sm editor-container">
            <Editor
              value={selectedTemplate.body || ""}
              onValueChange={(code) => onUpdateTemplate(t => t ? { ...t, body: code } : null)}
              highlight={(code) => highlight(code, languages.markup!, "markup")}
              padding={16}
              className="bg-transparent h-full"
              style={{ minHeight: "100%" }}
            />
          </div>
        ) : (
          <iframe
            srcDoc={selectedTemplate.body}
            title={t('previewTitle')}
            className="w-full h-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}