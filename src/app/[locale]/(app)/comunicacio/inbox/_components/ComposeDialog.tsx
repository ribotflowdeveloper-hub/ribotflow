// Ruta del fitxer: src/app/(app)/comunicacio/inbox/_components/ComposeDialog.tsx
"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { toast } from "sonner"; // ✅ 1. Importem 'toast' de sonner
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from '@/components/ui/toggle';
import { Loader2, Send, FileText, Variable, Bold, Italic, Strikethrough, List, ListOrdered, Heading2, User, Mail, Search } from 'lucide-react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { createClient } from '@/lib/supabase/client';
import { sendEmailAction } from '../actions';
import type { Template, Contact } from '../page';
import { useTranslations } from 'next-intl'; // ✅ Importem el hook

/**
 * Sub-component que renderitza la barra d'eines per a l'editor de text.
 * Rep l'instància de l'editor i mostra botons per a les accions més comunes.
 */
const EmailEditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;
    return (
        <div className="border border-input bg-transparent rounded-md p-1 flex gap-1 flex-wrap">
            <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Toggle>
            <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Toggle>
        </div>
    );
};
/**
 * Funció utilitària per substituir les variables (ex: {{nom_contacte}}) en un text
 * pels seus valors corresponents.
 * @param templateString El text de la plantilla amb variables.
 * @param values Un objecte amb els valors per a cada variable.
 */
const renderTemplate = (templateString: string, values: { [key: string]: string }) => {
    if (!templateString) return '';
    // Utilitza una expressió regular per buscar totes les ocurrències de {{...}}
    return templateString.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const key = varName.trim();
        // Retorna el valor si existeix, o la variable original si no.
        return values[key] || `{{${key}}}`;
    });
};
// Tipus per a les dades inicials que pot rebre el diàleg (ex: en respondre a un correu).

export type InitialData = {
    contactId?: string | null;
    to?: string | null;
    subject?: string | null;
    body?: string | null;
  };
  
/**
 * Component principal del diàleg per compondre i enviar correus.
 * Gestiona l'editor de text, la selecció de contactes, l'ús de plantilles i l'enviament final.
 */
  export const ComposeDialog = ({ open, onOpenChange, onEmailSent, initialData, templates = [] }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onEmailSent: () => void;
    initialData: InitialData | null; // ← permet null
    templates: Template[];
}) => {
    const editor = useEditor({
        immediatelyRender: false, 
        extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none text-base p-4 focus:outline-none h-full border border-input rounded-md min-h-[400px]',
            },
        },
    });
    const t = useTranslations('InboxPage'); // ✅ Cridem el hook

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSending, startSendTransition] = useTransition();
    const [contactSearch, setContactSearch] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
    const [debouncedVariableValues, setDebouncedVariableValues] = useState<{ [key: string]: string }>({});
  /**
     * S'executa cada cop que el diàleg s'obre ('open' canvia a true).
     * S'encarrega d'inicialitzar o resetejar tots els estats del diàleg:
     * - Carrega la llista de contactes des de Supabase.
     * - Omple els camps amb les dades inicials si n'hi ha (per a una resposta).
     * - Neteja els estats de plantilles, variables, etc.
     */
    useEffect(() => {
        const initDialog = async () => {
            if (open) {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if(!user) return;

                const { data } = await supabase.from('contacts').select('id, nom, email').eq('user_id', user.id);
                const sortedData = (data as Contact[] || []).sort((a, b) => a.nom.localeCompare(b.nom));
                setContacts(sortedData);
                
                setSelectedContactId(initialData?.contactId || '');
                setSubject(initialData?.subject || '');
                editor?.commands.setContent(initialData?.body || '');
                setSelectedTemplate(null);
                setVariableValues({});
                setDebouncedVariableValues({});
                setContactSearch('');
            }
        };
        initDialog();
    }, [open, initialData, editor]);
 /**
     * Aquest efecte implementa un "debounce" per a les variables de les plantilles.
     * En lloc de refrescar la vista prèvia a cada tecla que prem l'usuari, espera 500ms
     * després de l'última pulsació. Això millora molt el rendiment.
     */
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedVariableValues(variableValues), 500);
        return () => clearTimeout(handler);
    }, [variableValues]);
     /**
     * Actualitza l'assumpte del correu automàticament quan es fa servir una plantilla
     * i es modifiquen les seves variables (amb el debounce aplicat).
     */
    useEffect(() => {
        if (selectedTemplate) {
            setSubject(renderTemplate(selectedTemplate.subject, debouncedVariableValues));
        }
    }, [selectedTemplate, debouncedVariableValues]);
  /**
     * Calcula el cos final del correu en format HTML.
     * Si hi ha una plantilla seleccionada, renderitza la plantilla amb les variables.
     * Si no, obté l'HTML directament de l'editor Tiptap.
     * 'useMemo' optimitza aquest càlcul perquè només es torni a fer si les dependències canvien.
     */
    const finalHtmlBody = useMemo(() => {
        if (selectedTemplate) {
            return renderTemplate(selectedTemplate.body, debouncedVariableValues);
        }
        return editor?.getHTML() || '';
    }, [selectedTemplate, debouncedVariableValues, editor]);
 /**
     * Filtra la llista de contactes basant-se en el text introduït al cercador.
     * 'useMemo' assegura que aquesta filtració només es recalculi quan sigui necessari.
     */
    const filteredContacts = useMemo(() => {
        if (!contactSearch) return contacts;
        return contacts.filter(contact => contact.nom.toLowerCase().includes(contactSearch.toLowerCase()));
    }, [contacts, contactSearch]);
    /**
     * Gestiona la selecció d'una plantilla de la llista desplegable.
     * Si se'n selecciona una, actualitza l'estat. Si es deselecciona, torna als valors inicials.
     */
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
     /**
     * Gestiona l'enviament del correu.
     * Primer, valida que els camps necessaris no estiguin buits.
     * Després, crida la Server Action 'sendEmailAction' per enviar el correu des del backend.
     * Finalment, mostra una notificació d'èxit o error.
     */
    const handleSend = async () => {
        if (!selectedContactId || !subject || !finalHtmlBody.replace(/<p><\/p>/g, '').trim()) {
            toast.error(t('requiredFieldsErrorTitle'), { 
                description: t('requiredFieldsErrorDescription') 
            });
            return;
        }
        
        startSendTransition(async () => {
            const result = await sendEmailAction({
                contactId: selectedContactId, subject, htmlBody: finalHtmlBody, isReply: !!initialData?.contactId,
            });

            if (result.success) {
                toast.success(t('toastSuccessTitle'), { description: result.message });
                onOpenChange(false);
                if (onEmailSent) onEmailSent();
            } else {
                toast.error(t('toastErrorTitle'), { description: result.message });
            }
        });
    };

    return (
          // El JSX del diàleg, que es divideix en l'àrea d'edició i la barra lateral
        // amb el destinatari, les plantilles i les variables.
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
                            <Input placeholder={t('subjectPlaceholder')} value={subject} onChange={e => setSubject(e.target.value)} className="pl-9"/>
                            </div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {!selectedTemplate && <EmailEditorToolbar editor={editor} />}
                            
                            {selectedTemplate ? (
                                <div className="border rounded-md flex-1 bg-white">
                                    <iframe srcDoc={finalHtmlBody} title={t('previewTitle')} className="w-full h-full border-0"/>
                  </div>
                            ) : (
                                <EditorContent editor={editor} className="flex-1 overflow-y-auto"/>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6 bg-muted/30 p-4 rounded-lg overflow-y-auto">
                        <div className="space-y-2">
                        <Label htmlFor="contact-select" className="flex items-center gap-2 font-semibold"><User className="w-4 h-4"/>{t('recipientLabel')}</Label>
                        <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="contact-search" placeholder={t('searchContactPlaceholder')} value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9 mb-2"/>
                                </div>
                            <Select onValueChange={setSelectedContactId} value={selectedContactId}>
                            <SelectTrigger id="contact-select"><SelectValue placeholder={t('selectContactPlaceholder')} /></SelectTrigger>
                                <SelectContent>
                                    {filteredContacts.length > 0 ? filteredContacts.map(contact => <SelectItem key={contact.id} value={contact.id}>{contact.nom} ({contact.email})</SelectItem>) : <p className="p-4 text-sm text-muted-foreground">{t('noContactsFound')}</p>}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                        <Label htmlFor="template-select" className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4"/>{t('templateLabel')}</Label>
                        <Select onValueChange={handleTemplateSelect} defaultValue="none" disabled={templates.length === 0}>
                            <SelectTrigger id="template-select"><SelectValue placeholder={t('selectTemplatePlaceholder')} /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="none">{t('noTemplateOption')}</SelectItem>
                            {templates.map(template => <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>)}
                            </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                            <div className="space-y-4">
                            <Label className="flex items-center gap-2 font-semibold"><Variable className="w-4 h-4 text-primary"/>{t('variablesLabel')}</Label>
                            <div className="space-y-3">
                              {selectedTemplate.variables.map(varName => (
                                <div key={varName} className="space-y-1.5">
                                  <label htmlFor={`var-${varName}`} className="text-xs font-medium text-muted-foreground">{`{{${varName}}}`}</label>
                                  <Input id={`var-${varName}`} value={variableValues[varName] || ''} onChange={e => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))} placeholder={t('variablePlaceholder', {varName})}/>
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