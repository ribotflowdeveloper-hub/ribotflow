// Ubicació: /app/(app)/comunicacio/inbox/_hooks/useCompose.ts

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';

import { renderTemplate } from '@/lib/utils/templates';
import { sendEmailAction } from '../actions';
import type { Template } from '@/types/comunicacio/inbox';
import type { Contact } from '@/types/crm';
import type { InitialData } from '../_components/ComposeDialog';

// Propietats que el hook necessita del component
interface UseComposeProps {
    templates: Template[];
    contacts: Contact[]; // ✅ Ara rebem els contactes, no els busquem aquí
    initialData: InitialData | null;
    onClose: () => void;
    onEmailSent: () => void;
}

export function useCompose({ templates, contacts, initialData, onClose, onEmailSent }: UseComposeProps) {
    const t = useTranslations('InboxPage');
    const [isSending, startSendTransition] = useTransition();

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none text-base p-4 focus:outline-none h-full border border-input rounded-md min-h-[400px]',
            },
        },
    });

    const [subject, setSubject] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
    const [debouncedVariableValues, setDebouncedVariableValues] = useState<{ [key: string]: string }>({});

    // Efecte per inicialitzar el diàleg
    useEffect(() => {
        setSelectedContactId(initialData?.contactId || '');
        setSubject(initialData?.subject || '');
        editor?.commands.setContent(initialData?.body || '');
        setSelectedTemplate(null);
        setVariableValues({});
        setDebouncedVariableValues({});
        setContactSearch('');
    }, [initialData, editor]);

    // Efecte debounce per a les variables
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedVariableValues(variableValues), 500);
        return () => clearTimeout(handler);
    }, [variableValues]);

    // Efecte per actualitzar l'assumpte amb la plantilla
    useEffect(() => {
        if (selectedTemplate) {
            setSubject(renderTemplate(selectedTemplate.subject, debouncedVariableValues));
        }
    }, [selectedTemplate, debouncedVariableValues]);

    const finalHtmlBody = useMemo(() => {
        if (selectedTemplate) {
            return renderTemplate(selectedTemplate.body, debouncedVariableValues);
        }
        return editor?.getHTML() || '';
    }, [selectedTemplate, debouncedVariableValues, editor]);

    const filteredContacts = useMemo(() => {
        if (!contactSearch) return contacts;

        // ✅ CORRECCIÓ: Codi més segur i llegible
        const search = contactSearch.toLowerCase();

        return contacts.filter(contact => {
            const hasMatchingName = contact.nom.toLowerCase().includes(search);

            // Comprovem si l'email existeix I si coincideix amb la cerca
            const hasMatchingEmail = !!contact.email && contact.email.toLowerCase().includes(search);

            return hasMatchingName || hasMatchingEmail;
        });
    }, [contacts, contactSearch]);

    const handleTemplateSelect = (templateId: string) => {
        if (!templateId || templateId === 'none') {
            setSelectedTemplate(null);
            setVariableValues({});
            setSubject(initialData?.subject || '');
            editor?.commands.setContent(initialData?.body || '');
            return;
        }
        const template = templates.find(t => t.id.toString() === templateId);
        if (template) {
            setSelectedTemplate(template);
            setVariableValues({});
        }
    };

    const handleSend = () => {
        if (!selectedContactId || !subject || !finalHtmlBody.replace(/<p><\/p>/g, '').trim()) {
            toast.error(t('requiredFieldsErrorTitle'), { description: t('requiredFieldsErrorDescription') });
            return;
        }

        startSendTransition(async () => {
            const result = await sendEmailAction({
                contactId: selectedContactId,
                subject,
                htmlBody: finalHtmlBody,
                isReply: !!initialData?.contactId,
            });

            if (result.success) {
                toast.success(t('toastSuccessTitle'), { description: result.message });
                onClose();
                onEmailSent();
            } else {
                toast.error(t('toastErrorTitle'), { description: result.message });
            }
        });
    };

    // Retornem tots els estats i funcions que el component de UI necessitarà
    return {
        editor,
        subject, setSubject,
        selectedContactId, setSelectedContactId,
        contactSearch, setContactSearch,
        selectedTemplate, handleTemplateSelect,
        variableValues, setVariableValues,
        finalHtmlBody,
        filteredContacts,
        isSending,
        handleSend,
    };
}