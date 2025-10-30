'use client';

import { useCallback, useRef, ChangeEvent, useTransition, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
// Importem 'Editor' i 'JSONContent' per al tipat
import { useEditor, EditorContent, JSONContent, type Editor } from '@tiptap/react';
// Importem 'EditorProps' per al tipat de 'handlePaste'
import { type EditorProps } from '@tiptap/pm/view';
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
    maxHeight = 'none', // Valor per defecte
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
                    'prose dark:prose-invert prose-sm sm:prose-base fossssssss:outline-none max-w-none w-full',
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

    // --- LÒGICA PER INJECTAR EL 'handlePaste' DE FORMA SEGURA ---
    useEffect(() => {
        if (!editor) {
            return;
        }

        /**
         * Definim la lògica de 'handlePaste' aquí.
         * Gràcies al 'closure', tenim accés directe a la variable 'editor'
         * del hook 'useEditor' de forma totalment segura (type-safe).
         */
        const handlePasteCallback: EditorProps['handlePaste'] = (view, event, slice) => {
            // No cal (view as any).editor, fem servir 'editor' directament.
            if (!editor.isActive('taskList')) {
                return false; // Comportament per defecte
            }

            const pastedText = event.clipboardData?.getData('text/plain');

            if (!pastedText || !pastedText.includes('\n')) {
                return false; // Comportament per defecte
            }

            // *** INICI DE LA LÒGICA PERSONALITZADA ***
            event.preventDefault();

            const lines = pastedText
                .split('\n')
                .filter((line) => line.trim().length > 0);

            if (lines.length === 0) {
                return true; // Hem gestionat l'esdeveniment
            }

            const { $from } = editor.state.selection;
            const currentNode = $from.node($from.depth);
            const isCurrentTaskEmpty = currentNode.textContent.trim().length === 0;

            let chain = editor.chain().focus();

            if (isCurrentTaskEmpty) {
                const [firstLine, ...otherLines] = lines;
                chain.insertContent(firstLine);
                for (const line of otherLines) {
                    chain = chain.splitListItem('taskItem').insertContent(line);
                }
            } else {
                for (const line of lines) {
                    chain = chain.splitListItem('taskItem').insertContent(line);
                }
            }

            chain.run();
            return true;
        };

        // Actualitzem les editorProps de l'editor ja inicialitzat
        editor.setOptions({
            editorProps: {
                ...editor.options.editorProps, // Preservem les props existents (ex: attributes)
                handlePaste: handlePasteCallback, // Afegim la nostra lògica
            },
        });
    }, [editor]); // El array de dependències [editor] assegura que s'executi un sol cop

    // --- FI DE LA LÒGICA DEL 'handlePaste' ---

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

                    // ❌ EL TEU CODI ACTUAL (INCORRECTE)
                    // Està desant la URL temporal
                    /*
                    if (result.success && result.data?.signedUrl) {
                        console.log("[Client] Èxit! Inserint imatge.");
                        editor.chain().focus().setImage({
                            src: result.data.signedUrl, // <-- PROBLEMA: Això caduca
                            alt: file.name
                        }).run();
                        toast.success("Imatge inserida.");
                    } else {
                        // ...
                    }
                    */

                    // ✅ LA SOLUCIÓ (CORRECTA)
                    // Desa el 'filePath' permanent
                    if (result.success && result.data?.filePath) {
                        console.log("[Client] Èxit! Inserint 'filePath' permanent.");
                        editor.chain().focus().setImage({
                            // Ara el 'src' contindrà "task-uploads/team-123/file.jpg"
                            src: result.data.filePath, // <-- AQUEST ÉS EL CANVI
                            alt: file.name
                        }).run();
                        toast.success("Imatge inserida.");
                        // Ignorem la 'signedUrl', ja no la necessitem aquí.
                    } else {
                        console.error("[Client] Error SA:", result.message);
                        toast.error("Error en pujar", { description: result.message || "Problema al servidor." });
                    }
                } catch (error) {
                    if (loadingToastId) toast.dismiss(loadingToastId);
                    console.error('[Client] Error inesperat:', error);
                    toast.error("Error de connexió", { description: "No s'ha pogut contactar amb el servidor." });
                } finally {
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            });
        },
        [editor, startTransition, isPending]
    );

    // Sincronització del 'defaultValue' si canvia des de fora
    useEffect(() => {
        if (editor && !editor.isFocused) {
            const isSame = editor.getHTML() === defaultValue;
            if (!isSame) {
                // 👇 LÍNIA CORREGIDA:
                // Passem un objecte d'opcions en lloc d'un booleà.
                editor.commands.setContent(defaultValue, { emitUpdate: false });
            }
        }
    }, [defaultValue, editor]);

    if (!editor) return null;

    return (
        <TooltipProvider delayDuration={100}>
            <div className={cn('w-full rounded-md border border-input bg-background shadow-sm flex flex-col', className)}>
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
                        <EditorContent editor={editor} />
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