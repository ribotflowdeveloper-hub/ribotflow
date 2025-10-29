// Ubicació: /app/(app)/comunicacio/inbox/_components/EmailEditorToolbar.tsx

"use client";

import { type Editor } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';

interface EmailEditorToolbarProps {
    editor: Editor | null;
}

export const EmailEditorToolbar = ({ editor }: EmailEditorToolbarProps) => {
    const t = useTranslations('InboxPage.editor');
    if (!editor) return null;

    return (
        <div className="border border-input bg-transparent rounded-md p-1 flex gap-1 flex-wrap">
            <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} title={t('bold')}>
                <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} title={t('italic')}>
                <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} title={t('strike')}>
                <Strikethrough className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title={t('heading')}>
                <Heading2 className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} title={t('bulletList')}>
                <List className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} title={t('orderedList')}>
                <ListOrdered className="h-4 w-4" />
            </Toggle>
        </div>
    );
};