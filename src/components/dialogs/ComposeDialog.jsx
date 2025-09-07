import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from '@/components/ui/toggle';
import { Loader2, Send, FileText, Variable, Bold, Italic, Strikethrough, List, ListOrdered, Heading2, User, Mail, Search } from 'lucide-react';

// Editor de text Tiptap
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';

// --- Barra d'eines per a l'editor de text ---
const EmailEditorToolbar = ({ editor }) => {
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

// --- Funció auxiliar per reemplaçar les variables ---
const renderTemplate = (templateString, values) => {
    if (!templateString) return '';
    return templateString.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const key = varName.trim();
        return values[key] || `{{${key}}}`;
    });
};

export const ComposeDialog = ({ open, onOpenChange, onEmailSent, initialData, templates = [] }) => {
    // --- HOOKS ---
    const { user } = useAuth();
    const { toast } = useToast();
    const editor = useEditor({
        extensions: [StarterKit, TextAlign.configure({ types: ['heading', 'paragraph'] })],
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none text-base p-4 focus:outline-none h-full border border-input rounded-md min-h-[400px]',
            },
        },
    });

    // --- ESTATS ---
    const [contacts, setContacts] = useState([]);
    const [sending, setSending] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [variableValues, setVariableValues] = useState({});
    const [debouncedVariableValues, setDebouncedVariableValues] = useState({});

    // --- EFECTES ---
    // Efecte per inicialitzar el diàleg
    useEffect(() => {
        const initDialog = async () => {
            if (open && user) {
                const { data } = await supabase.from('contacts').select('id, nom, email').eq('user_id', user.id);
                const sortedData = (data || []).sort((a, b) => a.nom.localeCompare(b.nom));
                setContacts(sortedData);
                
                // Resetejar estats
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
    }, [open, initialData, user, editor]);
    
    // Efecte per suavitzar l'actualització de la vista prèvia (debounce)
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedVariableValues(variableValues), 500);
        return () => clearTimeout(handler);
    }, [variableValues]);
    
    // Efecte per actualitzar l'assumpte quan canvien les variables
    useEffect(() => {
        if (selectedTemplate) {
            setSubject(renderTemplate(selectedTemplate.subject, debouncedVariableValues));
        }
    }, [selectedTemplate, debouncedVariableValues]);

    // --- VALORS MEMORITZATS ---
    // ✅ CORRECCIÓ PRINCIPAL: Calculem 'finalHtmlBody' amb useMemo
    // Ara aquesta variable està disponible a tot el component i només es recalcula quan és necessari.
    const finalHtmlBody = useMemo(() => {
        if (selectedTemplate) {
            return renderTemplate(selectedTemplate.body, debouncedVariableValues);
        }
        // Retornem el contingut de l'editor si no hi ha plantilla seleccionada
        return editor?.getHTML() || '';
    }, [selectedTemplate, debouncedVariableValues, editor]);

    const filteredContacts = useMemo(() => {
        if (!contactSearch) return contacts;
        return contacts.filter(contact => contact.nom.toLowerCase().includes(contactSearch.toLowerCase()));
    }, [contacts, contactSearch]);

    // --- GESTORS D'ESDEVENIMENTS ---
    const handleTemplateSelect = (templateId) => {
        if (!templateId || templateId === 'none') {
            setSelectedTemplate(null);
            setVariableValues({});
            setSubject(initialData?.subject || '');
            editor?.commands.setContent(initialData?.body || '');
            return;
        }
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setVariableValues({}); // Reseteja valors en canviar de plantilla
        }
    };
    
    const handleSend = async () => {
        // La variable 'finalHtmlBody' ja està disponible gràcies a useMemo.
        if (!selectedContactId || !subject || !finalHtmlBody.replace(/<p><\/p>/g, '').trim()) {
            toast({ variant: 'destructive', title: 'Camps obligatoris', description: 'Has d\'omplir el destinatari, l\'assumpte i el cos.' });
            return;
        }
    
        setSending(true);
    
        try {
            const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: { contactId: selectedContactId, subject, htmlBody: finalHtmlBody }
            });
            if (emailError) throw new Error(emailError.message);
    
            toast({ title: 'Èxit!', description: 'El teu correu s\'ha enviat correctament.' });
    
            // Lògica per crear l'oportunitat
            const isReply = !!initialData?.contactId;
            if (isReply && selectedContactId === initialData.contactId) {
                const { data: existingOpportunities } = await supabase
                    .from('opportunities').select('id').eq('contact_id', initialData.contactId).limit(1);

                if (!existingOpportunities || existingOpportunities.length === 0) {
                    const { error: opportunityError } = await supabase.from('opportunities').insert({
                        user_id: user.id, contact_id: initialData.contactId, name: `Oportunitat: ${subject}`,
                        stage_name: 'Contactat', source: 'Resposta Email', value: 0,
                    });
                    if (opportunityError) {
                        toast({ variant: 'destructive', title: 'Avís', description: "El correu s'ha enviat, però no s'ha pogut crear l'oportunitat." });
                    } else {
                        toast({ title: 'Oportunitat Creada!', description: 'S\'ha creat una nova oportunitat per aquest contacte.' });
                    }
                }
            }
            
            onOpenChange(false);
            if (onEmailSent) onEmailSent();
    
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error en l\'enviament', description: `Ha fallat la petició: ${error.message}` });
        } finally {
            setSending(false);
        }
    };

    // --- RENDERITZAT ---
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Escriure un Correu</DialogTitle>
                    {/* ♿️ CORRECCIÓ D'ACCESSIBILITAT: Afegim una descripció per al diàleg */}
                    <DialogDescription>
                        Selecciona un destinatari, escriu un assumpte i compon el teu missatge o tria una plantilla.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Columna Esquerra (Editor/Vista Prèvia) */}
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

                    {/* Columna Dreta (Controls) */}
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
                                    {templates.map(template => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate && selectedTemplate.variables?.length > 0 && (
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
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar Correu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};