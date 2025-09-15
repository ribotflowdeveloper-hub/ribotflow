/**
 * @file TemplatesClient.tsx
 * @summary Component de client que proporciona la interfície d'usuari completa per a la gestió
 * de plantilles d'email. Inclou la llista de plantilles, l'editor de codi/vista prèvia i el panell de variables.
 */

"use client"; // És el cor interactiu de la pàgina de plantilles.

import React, { useState, useEffect, useTransition} from 'react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, Variable, Code, Eye, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// Llibreries per a l'editor de codi amb ressaltat de sintaxi.
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
// import 'prismjs/themes/prism-tomorrow.css'; // -> Aquests estils s'haurien d'importar al globals.css

import { type EmailTemplate } from '../page';
import { saveTemplateAction, deleteTemplateAction } from './actions';

export function TemplatesClient({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  // Hooks 'useTransition' per gestionar estats de càrrega de les accions de servidor sense bloquejar la UI.
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Gestió de l'estat local del component.
  const [templates, setTemplates] = useState(initialTemplates); // Llista de totes les plantilles.
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(initialTemplates[0] || null); // La plantilla actualment seleccionada per a edició.
  const [editorView, setEditorView] = useState('preview'); // Controla si es mostra l'editor de codi o la vista prèvia.
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]); // Variables detectades (ex: {{nom}}).
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null); // Per al diàleg de confirmació d'eliminació.

  // Aquest efecte s'executa cada vegada que canvia la plantilla seleccionada.
  // Analitza el contingut (assumpte i cos) per extreure les variables {{...}}.
  useEffect(() => {
    if (selectedTemplate) {
      const content = `${selectedTemplate.subject || ''} ${selectedTemplate.body || ''}`;
      const foundVariables = content.match(/\{\{([^}]+)\}\}/g) || [];
      const uniqueVariables = [...new Set(foundVariables.map(v => v.replace(/[{}]/g, '')))];
      setDetectedVariables(uniqueVariables);
    }
  }, [selectedTemplate]);

  // Gestor per crear una nova plantilla en blanc.
  const handleNewTemplate = () => {
    const newTpl: EmailTemplate = { id: 'new', name: 'Nova Plantilla', subject: '', body: '<h1>Hola {{nom_contacte}},</h1>\n<p>Contingut del teu correu...</p>', variables: [], created_at: new Date().toISOString(), user_id: '' };
    setSelectedTemplate(newTpl);
    setEditorView('code'); // Passem a la vista de codi automàticament.
  };

  // Gestor per desar la plantilla actual (crida a la Server Action).
  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    const templateData = { name: selectedTemplate.name, subject: selectedTemplate.subject, body: selectedTemplate.body, variables: detectedVariables };
    startSaveTransition(async () => {
        const { data, error } = await saveTemplateAction(templateData, selectedTemplate.id);
        if (error) {
          toast.error('Error', { description: error.message });
        } else if (data) {
          toast.success('Èxit!', { description: 'Plantilla desada correctament.' });
          // Actualitzem l'estat local immediatament ("Optimistic UI Update").
          // Això fa que la interfície se senti més ràpida, sense esperar la revalidació del servidor.
          if (selectedTemplate.id === 'new') { setTemplates(prev => [data, ...prev]); } 
          else { setTemplates(prev => prev.map(t => t.id === data.id ? data : t)); }
          setSelectedTemplate(data);
        }
    });
  };

  // Gestor per eliminar una plantilla (crida a la Server Action).
  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    startDeleteTransition(async () => {
        const { error } = await deleteTemplateAction(templateToDelete.id);
        if (error) {
          toast.error('Error', { description: error.message });
        } else {
          toast.success('Èxit!', { description: 'Plantilla eliminada.' });
          const newTemplates = templates.filter(t => t.id !== templateToDelete.id);
          setTemplates(newTemplates);
          setSelectedTemplate(newTemplates[0] || null); // Seleccionem la següent plantilla o cap.
        }
        setTemplateToDelete(null); // Tanquem el diàleg de confirmació.
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                {/* Capçalera de la pàgina */}

        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold">Editor de Plantilles</h1>
          <Button onClick={handleSaveTemplate} disabled={isSaving || !selectedTemplate}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
            Desar Plantilla
          </Button>
        </div>
        {/* Estructura principal de 3 columnes */}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 min-h-0">
          {/* Columna Llista de Plantilles */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold">Plantilles</h2>
              <Button size="icon" variant="ghost" onClick={handleNewTemplate}><Plus className="w-4 h-4" /></Button>
            </div>
                    

            <div className="flex-1 overflow-y-auto">
              {templates.map(template => (
                <div key={template.id} onClick={() => setSelectedTemplate(template)} 
                  className={`group flex justify-between items-center p-4 cursor-pointer border-l-4 ${selectedTemplate?.id === template.id ? 'bg-primary/20 border-primary' : 'border-transparent hover:bg-muted'}`}>
                  <p className="font-semibold truncate">{template.name}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setTemplateToDelete(template); }}>
                    <Trash2 className="w-4 h-4 text-destructive"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Editor Central */}
          {selectedTemplate ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input placeholder="Nom de la plantilla..." value={selectedTemplate.name} onChange={(e) => setSelectedTemplate(t => t ? {...t, name: e.target.value} : null)} />
                <Input placeholder="Assumpte del correu..." value={selectedTemplate.subject} onChange={(e) => setSelectedTemplate(t => t ? {...t, subject: e.target.value} : null)} />
              </div>
              <div className="flex-1 flex flex-col min-h-0 glass-card rounded-xl overflow-hidden">
                <div className="p-2 border-b border-border flex justify-between items-center"><h3 className="font-semibold px-2">Contingut</h3><div className="flex items-center gap-1 p-1 rounded-lg bg-black/20"><Button variant={editorView === 'code' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3" onClick={() => setEditorView('code')}><Code className="w-4 h-4 mr-2"/> Codi</Button><Button variant={editorView === 'preview' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3" onClick={() => setEditorView('preview')}><Eye className="w-4 h-4 mr-2"/> Vista Prèvia</Button></div></div>
                {editorView === 'code' ? (
                  <div className="flex-1 overflow-y-auto font-mono text-sm editor-container">
                    <Editor
                      value={selectedTemplate.body || ""}
                      onValueChange={(code: string) =>
                        setSelectedTemplate((t) => (t ? { ...t, body: code } : null))
                      }
                      highlight={(code: string) => highlight(code, languages.markup!, "markup")}
                      padding={16}
                      className="bg-transparent h-full"
                      style={{ minHeight: "100%" }}
                    />
                  </div>
                ) : (
                  <iframe srcDoc={selectedTemplate.body} title="Vista Prèvia" className="w-full h-full border-0 bg-white" />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 glass-card rounded-xl">
              <FileText className="w-16 h-16 text-muted-foreground mb-4"/>
              <h2 className="text-xl font-semibold">Selecciona o crea una plantilla</h2>
            </div>
          )}
          
          {/* Columna Variables */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold flex items-center gap-2"><Variable className="w-4 h-4 text-primary"/> Variables Detectades</h3></div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <p className="text-xs text-muted-foreground">La plataforma detecta automàticament les variables.</p>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.length > 0 ? detectedVariables.map(v => (
                  <Button key={v} variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`{{${v}}}`);                 toast.success("Copiat!", { description: `Variable {{${v}}} copiada.` });
                }}>
                    {`{{${v}}}`}
                  </Button>
                )) : <p className="text-xs text-muted-foreground italic">No s'ha detectat cap variable.</p>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Estàs segur?</AlertDialogTitle><AlertDialogDescription>Aquesta acció no es pot desfer. Això eliminarà la plantilla permanentment.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel·lar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTemplate} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Eliminant...' : 'Sí, elimina-la'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}