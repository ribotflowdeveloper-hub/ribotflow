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

const renderTemplate = (templateString: string, values: { [key: string]: string }) => {
    if (!templateString) return '';
    return templateString.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const key = varName.trim();
        return values[key] || `{{${key}}}`;
    });
};

export type InitialData = {
    contactId?: string | null;
    to?: string | null;
    subject?: string | null;
    body?: string | null;
  };
  

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

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSending, startSendTransition] = useTransition();
    const [contactSearch, setContactSearch] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableValues, setVariableValues] = useState<{ [key: string]: string }>({});
    const [debouncedVariableValues, setDebouncedVariableValues] = useState<{ [key: string]: string }>({});

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

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedVariableValues(variableValues), 500);
        return () => clearTimeout(handler);
    }, [variableValues]);
    
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
        return contacts.filter(contact => contact.nom.toLowerCase().includes(contactSearch.toLowerCase()));
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
    
    const handleSend = async () => {
        if (!selectedContactId || !subject || !finalHtmlBody.replace(/<p><\/p>/g, '').trim()) {
            toast.error('Camps obligatoris', { 
                description: 'Has d\'omplir el destinatari, l\'assumpte i el cos.' 
            });            return;
        }
        
        startSendTransition(async () => {
            const result = await sendEmailAction({
                contactId: selectedContactId, subject, htmlBody: finalHtmlBody, isReply: !!initialData?.contactId,
            });

            if (result.success) {
                toast.success('Èxit!', { description: result.message });
                onOpenChange(false);
                if (onEmailSent) onEmailSent();
            } else {
                toast.error('Error en l\'enviament', { description: result.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Escriure un Correu</DialogTitle>
                    <DialogDescription>
                        Selecciona un destinatari, escriu un assumpte i compon el teu missatge o tria una plantilla.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Assumpte..." value={subject} onChange={e => setSubject(e.target.value)} className="pl-9"/>
                        </div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {!selectedTemplate && <EmailEditorToolbar editor={editor} />}
                            
                            {selectedTemplate ? (
                                <div className="border rounded-md flex-1 bg-white">
                                    <iframe srcDoc={finalHtmlBody} title="Vista Prèvia" className="w-full h-full border-0"/>
                                </div>
                            ) : (
                                <EditorContent editor={editor} className="flex-1 overflow-y-auto"/>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6 bg-muted/30 p-4 rounded-lg overflow-y-auto">
                        <div className="space-y-2">
                            <Label htmlFor="contact-select" className="flex items-center gap-2 font-semibold"><User className="w-4 h-4"/> Destinatari</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="contact-search" placeholder="Cerca un contacte..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9 mb-2"/>
                            </div>
                            <Select onValueChange={setSelectedContactId} value={selectedContactId}>
                                <SelectTrigger id="contact-select"><SelectValue placeholder="Selecciona un contacte..." /></SelectTrigger>
                                <SelectContent>
                                    {filteredContacts.length > 0 ? filteredContacts.map(contact => <SelectItem key={contact.id} value={contact.id}>{contact.nom} ({contact.email})</SelectItem>) : <p className="p-4 text-sm text-muted-foreground">No s'han trobat contactes.</p>}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="template-select" className="flex items-center gap-2 font-semibold"><FileText className="w-4 h-4"/> Plantilla</Label>
                            <Select onValueChange={handleTemplateSelect} defaultValue="none" disabled={templates.length === 0}>
                                <SelectTrigger id="template-select"><SelectValue placeholder="Fes servir una plantilla..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Cap plantilla</SelectItem>
                                    {templates.map(template => <SelectItem key={template.id} value={template.id.toString()}>{template.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                            <div className="space-y-4">
                                <Label className="flex items-center gap-2 font-semibold"><Variable className="w-4 h-4 text-primary"/> Variables</Label>
                                <div className="space-y-3">
                                    {selectedTemplate.variables.map(varName => (
                                        <div key={varName} className="space-y-1.5">
                                            <label htmlFor={`var-${varName}`} className="text-xs font-medium text-muted-foreground">{`{{${varName}}}`}</label>
                                            <Input id={`var-${varName}`} value={variableValues[varName] || ''} onChange={e => setVariableValues(prev => ({ ...prev, [varName]: e.target.value }))} placeholder={`Valor per a ${varName}...`}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar Correu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};