// Imports de TipTap Extensions
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

// ✅ PAS 1: Importar les extensions de llista
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';

// Definició de l'extensió custom
export const FontSizeTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
      },
    };
  },
});

// Llista d'extensions exportada
export const defaultExtensions = [
  // ✅ PAS 2: Desactivem les llistes del StarterKit
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: false,  // Desactivat
    orderedList: false, // Desactivat
    listItem: false,    // Desactivat
  }),
  Underline,
  Highlight,
  Subscript,
  Superscript,
  TextStyle,
  FontSizeTextStyle, 
  Color,
  FontFamily,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
Link.configure({
    openOnClick: false, // Perfecte, permet editar sense saltar
    autolink: true,     // ✅ Detecta automàticament URLs quan escrius i prems espai
    defaultProtocol: 'https', // ✅ Si algú escriu "google.com", li posa https davant sol
    HTMLAttributes: {
      // Seguretat bàsica per a enllaços externs
      rel: 'noopener noreferrer',
      // Opcional: Pots forçar un color si Tailwind no ho està fent bé
      // class: 'text-primary underline', 
    },
  }),
  Image,
  Youtube,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  
  // ✅ PAS 3: CONFIGURACIÓ VISUAL DE LES LLISTES (El canvi clau)
  ListItem,
  
  BulletList.configure({
    HTMLAttributes: {
      class: 'list-disc list-outside ml-4', // Punts visibles + marge
    },
  }),
  
  OrderedList.configure({
    HTMLAttributes: {
      class: 'list-decimal list-outside ml-4', // Números visibles + marge
    },
  }),
];