// src/app/[locale]/(app)/comunicacio/inbox/_components/ComposeDialog.tsx
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { EditorContent } from '@tiptap/react';
import { Loader2, Send, FileText, Variable, User, Mail, Search } from 'lucide-react';

// Components de UI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmailEditorToolbar } from './EmailEditorToolbar';

// Hook i Tipus
import { useCompose } from '../_hooks/useCompose';
// ✨ CANVI: Importem els tipus de la nostra única font de la veritat.
import type { Contact, Template } from '@/types/db';

export type InitialData = {
  contactId?: string | null;
  to?: string | null;
  subject?: string | null;
  body?: string | null;
};

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEmailSent: () => void;
  initialData: InitialData | null;
  templates: Template[];
  contacts: Contact[];
}

export const ComposeDialog = (props: ComposeDialogProps) => {
  const { open, onOpenChange, onEmailSent, initialData, templates, contacts } = props;
  const t = useTranslations('InboxPage');

  const {
    editor, subject, setSubject,
    selectedContactId, setSelectedContactId,
    contactSearch, setContactSearch,
    selectedTemplate, handleTemplateSelect,
    variableValues, setVariableValues,
    finalHtmlBody, filteredContacts, isSending, handleSend,
  } = useCompose({
    templates,
    contacts,
    initialData,
    onClose: () => onOpenChange(false),
    onEmailSent,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('composeDialogTitle')}</DialogTitle>
          <DialogDescription>{t('composeDialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t('subjectPlaceholder')} value={subject} onChange={e => setSubject(e.target.value)} className="pl-9" />
            </div>
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {!selectedTemplate && <EmailEditorToolbar editor={editor} />}
              {selectedTemplate ? (
                <div className="border rounded-md flex-1 bg-white">
                  <iframe srcDoc={finalHtmlBody} title={t('previewTitle')} className="w-full h-full border-0" />
                </div>
              ) : (
                <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
              )}
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-6 bg-muted/30 p-4 rounded-lg overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="contact-select" className="flex items-center gap-2 font-semibold"><User className="w-4 h-4" />{t('recipientLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="contact-search" placeholder={t('searchContactPlaceholder')} value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9 mb-2" />
              </div>
              <Select onValueChange={(value) => setSelectedContactId(Number(value))} value={String(selectedContactId)}>
                <SelectTrigger id="contact-select"><SelectValue placeholder={t('selectContactPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {filteredContacts.length > 0 ? filteredContacts.map(contact => <SelectItem key={contact.id} value={String(contact.id)}>{contact.nom} ({contact.email})</SelectItem>) : <p className="p-4 text-sm text-muted-foreground">{t('noContactsFound')}</p>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="template-select" className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4" />{t('templateLabel')}</Label>
                <Select onValueChange={handleTemplateSelect} defaultValue="none" disabled={templates.length === 0}>
                    <SelectTrigger id="template-select"><SelectValue placeholder={t('selectTemplatePlaceholder')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('noTemplateOption')}</SelectItem>
                        {templates.map(template => <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {selectedTemplate?.variables && Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0 && (
                <div className="space-y-4">
                    <Label className="flex items-center gap-2 font-semibold"><Variable className="w-4 h-4 text-primary" />{t('variablesLabel')}</Label>
                    <div className="space-y-3">
                        {(selectedTemplate.variables as string[]).map(varName => (
                            <div key={varName} className="space-y-1.5">
                                <label htmlFor={`var-${varName}`} className="text-xs font-medium text-muted-foreground">{`{{${varName}}}`}</label>
                                <Input
                                    id={`var-${varName}`}
                                    value={variableValues[varName] || ''}
                                    onChange={e => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))}
                                    placeholder={t('variablePlaceholder', { varName })}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancelButton')}</Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {t('sendButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};