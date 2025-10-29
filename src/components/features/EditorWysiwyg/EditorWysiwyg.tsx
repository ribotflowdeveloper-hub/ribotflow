// src/components/ui/EditorWysiwyg.tsx (COMPLET I CORREGIT)
'use client';

import { useCallback, useRef,  ChangeEvent, useTransition, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
// Assegura't que aquestes rutes siguin correctes
import { defaultExtensions } from './tiptapExtensions';
import { EditorToolbar } from './EditorToolbar';
import { cn } from '@/lib/utils/utils';
// 👇 Verifica que aquesta ruta sigui correcta per al teu projecte
import { uploadTaskImageAction } from '@/app/actions/tasks/actions';
import { toast } from 'sonner';

interface EditorWysiwygProps {
    id: string;
    name: string;
    defaultValue?: string;
    onChange?: (html: string, json: JSONContent) => void;
    className?: string;
    minHeight?: string;
    maxHeight?: string;
}

export default function EditorWysiwyg({
    id,
    name,
    defaultValue = '',
    onChange,
    className,
    minHeight = '150px', // Valor per defecte
    maxHeight = 'none',  // Valor per defecte
}: EditorWysiwygProps) {
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: defaultExtensions,
        content: defaultValue,
        editorProps: {
            attributes: {
                class: cn(
                    'prose dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none w-full',
                    // Apliquem minHeight directament a l'estil inline per més control
                ),
                 style: `min-height: ${minHeight};`, // Estil inline per minHeight
                 id: `editor-${id}`,
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
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Introdueix la URL', previousUrl || '');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    }, [editor]);

    const addImage = useCallback(() => {
        if (isPending) return;
        fileInputRef.current?.click();
    }, [isPending]);

    const handleImageUpload = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            if (!editor || isPending || !event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Imatge massa gran", { description: "La mida màxima és 5MB." });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error("Format no permès", { description: "Només imatges." });
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            startTransition(async () => {
                let loadingToastId: string | number | undefined;
                try {
                    console.log("[Client] Cridant Server Action 'uploadTaskImageAction'...");
                    loadingToastId = toast.loading("Pujant imatge...");

                    const result = await uploadTaskImageAction(formData);

                    toast.dismiss(loadingToastId);

                    if (result.success && result.data?.signedUrl) {
                        console.log("[Client] Èxit! Inserint imatge.");
                        editor.chain().focus().setImage({
                            src: result.data.signedUrl,
                            alt: file.name
                         }).run();
                        toast.success("Imatge inserida.");
                    } else {
                        console.error("[Client] Error SA:", result.message);
                        toast.error("Error en pujar", { description: result.message || "Problema al servidor." });
                    }
                } catch (error) {
                    if(loadingToastId) toast.dismiss(loadingToastId);
                    console.error('[Client] Error inesperat:', error);
                    toast.error("Error de connexió", { description: "No s'ha pogut contactar amb el servidor." });
                } finally {
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            });
        },
        [editor, startTransition, isPending]
    );

    useEffect(() => {
        if (editor && defaultValue !== editor.getHTML()) {
            editor.commands.setContent(defaultValue);
        }
    }, [defaultValue, editor]);

    if (!editor) return null;

    return (
        <TooltipProvider delayDuration={100}>
            <div className={cn('w-full rounded-md border...', className)}>
                <EditorToolbar
                    editor={editor}
                    isUploading={isPending}
                    addImage={addImage}
                    setLink={setLink}
                />
                <div className="flex-1 min-h-0 relative">
                    <div
                        className="overflow-y-auto p-4 border-t border-input"
                        style={{ maxHeight: maxHeight !== 'none' ? maxHeight : undefined }}
                    >
                        <EditorContent editor={editor} className="min-h-full" style={{minHeight: minHeight}} />
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isPending}
                    />
                    <textarea
                        id={id}
                        name={name}
                        value={editor.getHTML()}
                        className="hidden"
                        readOnly
                        aria-hidden="true"
                    />
                </div>
            </div>
        </TooltipProvider>
    );
}