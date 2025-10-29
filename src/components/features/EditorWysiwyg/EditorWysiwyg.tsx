'use client';

import { useCallback, useRef, useState, ChangeEvent } from 'react';
// Imports de shadcn/ui (només els necessaris per al wrapper)
import { TooltipProvider } from '@/components/ui/tooltip';

// Imports de TipTap (només els necessaris per al 'hook' i 'content')
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';

// Imports de la nostra refactorització
import { defaultExtensions } from './tiptapExtensions';
import { EditorToolbar } from './EditorToolbar';

// Imports de Supabase i utils
import { cn } from '@/lib/utils/utils';
import { createClient } from '@/lib/supabase/client';

interface EditorWysiwygProps {
  id: string;
  name: string;
  defaultValue?: string;
  onChange?: (html: string, json: JSONContent) => void;
  className?: string;
}

export default function EditorWysiwyg({
  id,
  name,
  defaultValue = '',
  onChange,
  className,
}: EditorWysiwygProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: defaultExtensions, // ✅ Molt més net!
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none min-h-[150px] max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML(), editor.getJSON());
      }
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL', editor.getAttributes('link').href);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!editor || !event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      setIsUploading(true);

      try {
        const supabase = createClient();
        const bucketName = 'assets-publics'; // Assegurem que utilitzem el bucket correcte
        const filePath = `tasks/${Date.now()}_${file.name}`;

        const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file);

        if (error) {
          throw error;
        }

        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);

        if (publicUrlData) {
          editor.chain().focus().setImage({ src: publicUrlData.publicUrl }).run();
        }
      } catch (error) {
        console.error('Error pujant la imatge:', error);
        // Pendent: Notificació amb 'sonner'
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'w-full rounded-md border border-input bg-transparent text-sm ring-offset-background',
          'flex flex-col',
          className
        )}
      >
        {/* ✅ Barra d'eines refactoritzada */}
        <EditorToolbar
          editor={editor}
          isUploading={isUploading}
          addImage={addImage}
          setLink={setLink}
        />

        {/* Contenidor de contingut */}
        <div className="flex-1 min-h-0">
          <div className="h-[300px] overflow-y-auto p-4 bg-background rounded-b-md border-t border-input">
            <EditorContent editor={editor} className="min-h-full focus:outline-none" />
          </div>

          {/* Input de fitxer ocult */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Textarea oculta per al formulari */}
          <textarea
            id={id}
            name={name}
            value={editor?.getHTML() ?? ''}
            className="hidden"
            readOnly
          />
        </div>
      </div>
    </TooltipProvider>
  );
}