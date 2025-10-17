// src/components/ui/EditorWysiwyg.tsx

'use client';

import { useCallback } from "react";
// Imports de shadcn/ui
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Imports de TipTap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Youtube } from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

// Imports d'icones de Lucide React
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Code,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
    Highlighter, Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
    Table as TableIcon, Undo, Redo, Heading1, Heading2, Heading3, Pilcrow,
    CaseSensitive, Type, Palette,
    CheckSquare,
    Star
} from 'lucide-react';

interface EditorWysiwygProps {
  id: string;
  name: string;
  defaultValue?: string;
  onChange?: (html: string) => void;
}

const FontSizeTextStyle = TextStyle.extend({
    addAttributes() {
        return { ...this.parent?.(), fontSize: { default: null, parseHTML: el => el.style.fontSize, renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {} } };
    },
});

export default function EditorWysiwyg({ id, name, defaultValue = '', onChange }: EditorWysiwygProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ 
        heading: { levels: [1, 2, 3] },
        // ✅ CORRECCIÓ: Hem eliminat 'listItem: false'
      }),
      Underline, Highlight, Subscript, Superscript, TextStyle, FontSizeTextStyle, Color, FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }), Image, Youtube,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: defaultValue,
    editorProps: { attributes: { class: 'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none min-h-[150px] max-w-none' } },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL', editor.getAttributes('link').href);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL de la imatge');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);
  
  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full rounded-md border border-input bg-transparent text-sm ring-offset-background">
        <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-input">
          {/* Dropdown de Format (Títols) */}
          <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="w-32 justify-start">
                        {editor.isActive('heading', { level: 1 }) ? <Heading1 className="w-4 h-4 mr-2" /> :
                         editor.isActive('heading', { level: 2 }) ? <Heading2 className="w-4 h-4 mr-2" /> :
                         editor.isActive('heading', { level: 3 }) ? <Heading3 className="w-4 h-4 mr-2" /> :
                         <Pilcrow className="w-4 h-4 mr-2" />}
                        <span>
                            {editor.isActive('heading', { level: 1 }) ? 'Títol 1' :
                             editor.isActive('heading', { level: 2 }) ? 'Títol 2' :
                             editor.isActive('heading', { level: 3 }) ? 'Títol 3' : 'Paràgraf'}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Format de Text</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>Paràgraf</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>Títol 1</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Títol 2</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>Títol 3</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-input mx-1"></div>

          {/* Formats Bàsics */}
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><Bold className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Negreta</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><Italic className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Cursiva</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><UnderlineIcon className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Subratllat</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><Strikethrough className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Ratllat</p></TooltipContent></Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight({ color: '#FBBF24' }).run()} className={editor.isActive('highlight') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}>
                <Star className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Ressaltar</p></TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-input mx-1"></div>
          
          {/* Mida de Text */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild><Button type="button" variant="ghost" size="icon"><CaseSensitive className="w-4 h-4" /></Button></TooltipTrigger>
              <TooltipContent><p>Mida de Text</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              {['12px', '14px', '16px', '18px', '24px'].map(size => (<DropdownMenuItem key={size} onSelect={() => editor.chain().focus().setMark('textStyle', { fontSize: size }).run()} className={editor.isActive('textStyle', { fontSize: size }) ? 'bg-accent' : ''}>{size}</DropdownMenuItem>))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => editor.chain().focus().setMark('textStyle', { fontSize: null }).run()}>Reset</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Família de Font */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild><Button type="button" variant="ghost" size="icon"><Type className="w-4 h-4" /></Button></TooltipTrigger>
              <TooltipContent><p>Font</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent>
              {["Inter", "Arial", "Georgia", "monospace", "serif"].map(font => (<DropdownMenuItem key={font} style={{ fontFamily: font }} onSelect={() => editor.chain().focus().setFontFamily(font).run()} className={editor.isActive('textStyle', { fontFamily: font }) ? 'bg-accent' : ''}>{font}</DropdownMenuItem>))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => editor.chain().focus().unsetFontFamily().run()}>Reset</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Color de Text */}
          <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" asChild>
                    <label className="cursor-pointer"><Palette className="w-4 h-4" style={{ color: editor.getAttributes('textStyle').color || 'inherit' }} /><Input type="color" className="sr-only" value={editor.getAttributes('textStyle').color || '#000000'} onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} /></label>
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Color de Text</p></TooltipContent>
          </Tooltip>
          
          <div className="w-px h-6 bg-input mx-1"></div>

          {/* Llistes i blocs */}
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><List className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Llista</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><ListOrdered className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Llista ordenada</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><CheckSquare className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Llista de tasques</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><Quote className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Cita</p></TooltipContent></Tooltip>
          
          <div className="w-px h-6 bg-input mx-1"></div>

          {/* Alineació, Insercions, Historial... */}
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><AlignLeft className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Alinear a l'esquerra</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><AlignCenter className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Centrar</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><AlignRight className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Alinear a la dreta</p></TooltipContent></Tooltip>
          <div className="w-px h-6 bg-input mx-1"></div>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={setLink} className={editor.isActive('link') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}><LinkIcon className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Afegir Enllaç</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={addImage}><ImageIcon className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Afegir Imatge</p></TooltipContent></Tooltip>
          <div className="w-px h-6 bg-input mx-1"></div>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Desfer</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent><p>Refer</p></TooltipContent></Tooltip>

        </div>
        <div className="p-4 rounded-b-md">
          <EditorContent editor={editor} />
          <textarea id={id} name={name} value={editor.getHTML()} className="hidden" readOnly />
        </div>
      </div>
    </TooltipProvider>
  );
}