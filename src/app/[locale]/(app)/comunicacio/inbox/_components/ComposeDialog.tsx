// /src/app/[locale]/(app)/comunicacio/inbox/_components/ComposeDialog.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { EditorContent } from '@tiptap/react';
import { Loader2, Send, FileText, Variable, User, Mail, Search, Lock } from 'lucide-react'; // ✅ 1. Importem 'Lock'
import Link from 'next/link';

// Components de UI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmailEditorToolbar } from './EmailEditorToolbar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ 2. Importem Tooltip
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 3. Importem el tipus

// Hook i Tipus
import { useCompose } from '../_hooks/useCompose';
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
  limitStatus: UsageCheckResult; // ✅ 4. Afegim la prop de límit de tiquets
}

export const ComposeDialog = (props: ComposeDialogProps) => {
  // ✅ 5. Extraiem 'limitStatus' de les props
  const { open, onOpenChange, onEmailSent, initialData, templates, contacts, limitStatus } = props;
  const t = useTranslations('InboxPage');
  const t_billing = useTranslations('Billing'); // Per al missatge de límit

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

  // ✅ 6. Calculem si s'ha assolit el límit
  const isLimitReached = !limitStatus.allowed;

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
        
        {/* ✅ 7. Botó "Enviar" amb control de límit */}
        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t('cancelButton')}
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isLimitReached ? 0 : -1}>
                  <Button onClick={handleSend} disabled={isSending || isLimitReached}>
                    {isSending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : isLimitReached ? (
                      <Lock className="w-4 h-4 mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {isLimitReached ? t_billing('limitReachedTitle') : t('sendButton')}
                  </Button>
                </span>
              </TooltipTrigger>
              {isLimitReached && (
                <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-yellow-900" />
                      <h3 className="font-semibold">{t_billing('limitReachedTitle')}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {limitStatus.error || t_billing('limitReachedDefault')}
                    </p>
                    <Button asChild size="sm" className="mt-1 w-full">
                      <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                    </Button>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};