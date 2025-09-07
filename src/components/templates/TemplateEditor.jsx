import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TemplateToolbar } from './TemplateToolbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';

const TemplateEditor = ({ content, onChange }) => {
  const [viewMode, setViewMode] = useState('preview'); // 'visual', 'code', 'preview'

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none text-base p-4 focus:outline-none h-full',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && viewMode === 'visual' && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, viewMode, editor]);
  
  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex justify-between items-center">
        <div className="flex-1">
            {viewMode === 'visual' && <TemplateToolbar editor={editor} />}
        </div>
        <div className="flex items-center gap-2 p-1 rounded-lg bg-black/20">
            <Button variant={viewMode === 'visual' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('visual')}>Editar</Button>
            <Button variant={viewMode === 'code' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('code')}>Codi</Button>
            <Button variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('preview')}>Vista Prèvia</Button>
        </div>
      </div>
      <div className="flex-1 border border-input rounded-md overflow-hidden">
        {viewMode === 'visual' && (
          <EditorContent editor={editor} className="h-full overflow-y-auto" />
        )}
        {viewMode === 'code' && (
          <div className="w-full h-full overflow-y-auto font-mono text-sm bg-transparent editor-container">
            <Editor
              value={content || ''}
              onValueChange={onChange}
              highlight={code => highlight(code, languages.markup, 'markup')}
              padding={16}
              style={{ minHeight: '100%' }}
            />
          </div>
        )}
        {viewMode === 'preview' && (
            <iframe
                srcDoc={content}
                title="Vista Prèvia de la Plantilla"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts"
            />
        )}
      </div>
    </div>
  );
};

export default TemplateEditor;