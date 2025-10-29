'use client';

import { Editor } from '@tiptap/react';

// Imports de shadcn/ui
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Imports d'icones de Lucide React
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  CaseSensitive,
  Type,
  Palette,
  CheckSquare,
  Star,
  Loader2,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
  isUploading: boolean;
  addImage: () => void;
  setLink: () => void;
}

export function EditorToolbar({ editor, isUploading, addImage, setLink }: EditorToolbarProps) {
  return (
    <div className="flex-shrink-0 flex flex-wrap items-center gap-1 px-2 py-2 border-b border-input sticky top-0 z-10 bg-background">
      {/* Dropdown de Format (Títols) */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-32 justify-start">
              {editor.isActive('heading', { level: 1 }) ? (
                <Heading1 className="w-4 h-4 mr-2" />
              ) : editor.isActive('heading', { level: 2 }) ? (
                <Heading2 className="w-4 h-4 mr-2" />
              ) : editor.isActive('heading', { level: 3 }) ? (
                <Heading3 className="w-4 h-4 mr-2" />
              ) : (
                <Pilcrow className="w-4 h-4 mr-2" />
              )}
              <span>
                {editor.isActive('heading', { level: 1 })
                  ? 'Títol 1'
                  : editor.isActive('heading', { level: 2 })
                    ? 'Títol 2'
                    : editor.isActive('heading', { level: 3 })
                      ? 'Títol 3'
                      : 'Paràgraf'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Format de Text</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
            Paràgraf
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            Títol 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            Títol 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            Títol 3
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-input mx-1"></div>

      {/* Formats Bàsics */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={
              editor.isActive('bold')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <Bold className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Negreta</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={
              editor.isActive('italic')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <Italic className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cursiva</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={
              editor.isActive('underline')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Subratllat</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={
              editor.isActive('strike')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ratllat</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#FBBF24' }).run()}
            className={
              editor.isActive('highlight')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <Star className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ressaltar</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-input mx-1"></div>

      {/* Mida de Text */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <CaseSensitive className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mida de Text</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          {['12px', '14px', '16px', '18px', '24px'].map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: size }).run()}
              className={editor.isActive('textStyle', { fontSize: size }) ? 'bg-accent' : ''}
            >
              {size}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetMark('textStyle').run()}
          >
            Reset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Família de Font */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <Type className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Font</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          {['Inter', 'Arial', 'Georgia', 'monospace', 'serif'].map((font) => (
            <DropdownMenuItem
              key={font}
              style={{ fontFamily: font }}
              onClick={() => editor.chain().focus().setFontFamily(font).run()}
              className={editor.isActive('textStyle', { fontFamily: font }) ? 'bg-accent' : ''}
            >
              {font}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>
            Reset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Color de Text */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" asChild>
            <label className="cursor-pointer">
              <Palette
                className="w-4 h-4"
                style={{ color: editor.getAttributes('textStyle').color || 'inherit' }}
              />
              <Input
                type="color"
                className="sr-only"
                value={editor.getAttributes('textStyle').color || '#000000'}
                onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              />
            </label>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Color de Text</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-input mx-1"></div>

      {/* Llistes i blocs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={
              editor.isActive('bulletList')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <List className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Llista</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={
              editor.isActive('orderedList')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Llista ordenada</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={
              editor.isActive('taskList')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <CheckSquare className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Llista de tasques</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={
              editor.isActive('blockquote')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <Quote className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cita</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-input mx-1"></div>

      {/* Alineació, Insercions, Historial... */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={
              editor.isActive({ textAlign: 'left' })
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Alinear a l'esquerra</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={
              editor.isActive({ textAlign: 'center' })
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Centrar</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={
              editor.isActive({ textAlign: 'right' })
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <AlignRight className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Alinear a la dreta</p>
        </TooltipContent>
      </Tooltip>
      <div className="w-px h-6 bg-input mx-1"></div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={setLink}
            className={
              editor.isActive('link')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Afegir Enllaç</p>
        </TooltipContent>
      </Tooltip>

      {/* Botó d'imatge amb estat de càrrega */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={addImage}
            disabled={isUploading}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Afegir Imatge</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-input mx-1"></div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Undo className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Desfer</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refer</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}