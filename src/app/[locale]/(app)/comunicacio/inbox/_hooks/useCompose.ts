// src/app/[locale]/(app)/comunicacio/inbox/_hooks/useCompose.ts
"use client"; 

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';

import { renderTemplate } from '@/lib/utils/templates';
import { sendEmailActionWithManualCreate } from '../actions'; 

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
  // He canviat a 't_toast' per coherència amb el teu ComposeDialog
  const t_toast = useTranslations('InboxPage.toast'); 
  const [isSending, startSendTransition] = useTransition();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none text-base p-4 focus:outline-none min-h-[400px]',
      },
    },
  });
  
  const [subject, setSubject] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<number | ''>(''); 
  const [contactSearch, setContactSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
  const [debouncedVariableValues, setDebouncedVariableValues] = useState<{ [key: string]: string }>({});
  
  // ✅ 1. CANVI: Substituïm el 'boolean' pel 'number | null'
  // const [createOpportunity, setCreateOpportunity] = useState(false); // ❌ ELIMINAT
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);

  // Estats per al destinatari (això estava bé)
  const [recipientMode, setRecipientMode] = useState<'contact' | 'manual'>('contact');
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => {
    const contactIdNum = initialData?.contactId ? Number(initialData.contactId) : '';
    setSelectedContactId(contactIdNum);
    setSubject(initialData?.subject || '');
    editor?.commands.setContent(initialData?.body || '');
    setSelectedTemplate(null);
    setVariableValues({});
    setDebouncedVariableValues({});
    setContactSearch('');
    
    // ✅ 2. CANVI: Resetejem el nou estat
    // setCreateOpportunity(false); // ❌ ELIMINAT
    setSelectedPipelineId(null); // Reseteja el selector a "No crear"

    setRecipientMode(initialData?.contactId ? 'contact' : 'contact');
    setManualEmail(initialData?.to || '');
  
    if (initialData?.to && !initialData?.contactId) {
      setRecipientMode('manual');
      setSelectedContactId('');
    }

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
    const isBodyEmpty = !selectedTemplate 
      ? (editor?.isEmpty || !editor)
      : !finalHtmlBody.replace(/<p><\/p>/g, '').trim();

    const hasRecipient = (recipientMode === 'contact' && !!selectedContactId) || 
                      (recipientMode === 'manual' && !!manualEmail.trim());

    if (!hasRecipient || !subject.trim() || isBodyEmpty) {
      toast.error(t_toast('requiredFieldsErrorTitle'), { 
        description: t_toast('requiredFieldsErrorDescription') 
      });
      return;
    }

    if (recipientMode === 'manual' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail)) {
      toast.error(t_toast('toastErrorTitle'), { description: t_toast('invalidEmailFormat') });
      return;
    }
    
    startSendTransition(async () => {
      // ✅ 3. CANVI: Passem el 'selectedPipelineId'
      const result = await sendEmailActionWithManualCreate({
        contactId: recipientMode === 'contact' ? Number(selectedContactId) : null,
        manualEmail: recipientMode === 'manual' ? manualEmail.trim() : null,
        subject: subject.trim(),
        htmlBody: finalHtmlBody,
        // createOpportunity: createOpportunity, // ❌ ELIMINAT
        selectedPipelineId: selectedPipelineId, // ✅ AFEGIT
      });
      
      if (result.success) {
        toast.success(t_toast('toastSuccessTitle'), { description: result.message });
        onClose();
        onEmailSent();
      } else {
        toast.error(t_toast('toastErrorTitle'), { description: result.message });
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
    
    // ✅ 4. CANVI: Exportem els estats correctes
    // createOpportunity, setCreateOpportunity, // ❌ ELIMINAT
    selectedPipelineId, setSelectedPipelineId, // ✅ AFEGIT (Això arregla l'error TS-2339)
    
    recipientMode, setRecipientMode,
    manualEmail, setManualEmail
  };
}