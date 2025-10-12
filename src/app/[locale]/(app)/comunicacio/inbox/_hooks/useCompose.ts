// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useCompose.ts
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';

import { renderTemplate } from '@/lib/utils/templates';
import { sendEmailAction } from '../actions';

// ✨ CANVI: Importem els tipus directament de db.ts
import type { Contact, Template } from '@/types/db';
import type { InitialData } from '../_components/ComposeDialog';

interface UseComposeProps {
  templates: Template[];
  contacts: Contact[];
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
  const [selectedContactId, setSelectedContactId] = useState<number | ''>(''); // ✨ CANVI: L'ID és un número.
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null); // ✨ CANVI: Utilitzem el tipus 'Template'
  const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
  const [debouncedVariableValues, setDebouncedVariableValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // ✨ CANVI: Assegurem que el contactId és un número.
    setSelectedContactId(initialData?.contactId ? Number(initialData.contactId) : '');
    setSubject(initialData?.subject || '');
    editor?.commands.setContent(initialData?.body || '');
    setSelectedTemplate(null);
    setVariableValues({});
    setDebouncedVariableValues({});
    setContactSearch('');
  }, [initialData, editor]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedVariableValues(variableValues), 500);
    return () => clearTimeout(handler);
  }, [variableValues]);
  
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.subject) {
      setSubject(renderTemplate(selectedTemplate.subject, debouncedVariableValues));
    }
  }, [selectedTemplate, debouncedVariableValues]);

  const finalHtmlBody = useMemo(() => {
    if (selectedTemplate && selectedTemplate.body) {
      return renderTemplate(selectedTemplate.body, debouncedVariableValues);
    }
    return editor?.getHTML() || '';
  }, [selectedTemplate, debouncedVariableValues, editor]);
  
  const filteredContacts = useMemo(() => {
    if (!contactSearch) return contacts;
    const search = contactSearch.toLowerCase();
    return contacts.filter(contact => {
      // ✨ SENSE CANVI: 'nom' és correcte segons la teva definició de la taula.
      const hasMatchingName = contact.nom.toLowerCase().includes(search);
      const hasMatchingEmail = !!contact.email && contact.email.toLowerCase().includes(search);
      return hasMatchingName || hasMatchingEmail;
    });
  }, [contacts, contactSearch]);

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId || templateId === 'none') {
      setSelectedTemplate(null);
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
        contactId: Number(selectedContactId), // Assegurem que és un número.
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

  return {
    editor, subject, setSubject,
    selectedContactId, setSelectedContactId,
    contactSearch, setContactSearch,
    selectedTemplate, handleTemplateSelect,
    variableValues, setVariableValues,
    finalHtmlBody, filteredContacts, isSending, handleSend,
  };
}