"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, List, FileText, Variable, Plus } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useTemplates } from '../_hooks/useTemplates';

import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { TemplateVariables } from './TemplateVariables';
import type { EmailTemplate } from '@/types/db';

export function TemplatesClient({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  const {
    isSaving, isDeleting,
    templates,
    selectedTemplate, setSelectedTemplate,
    templateToDelete, setTemplateToDelete,
    setDetectedVariables,
    handleNewTemplate,
    handleSaveTemplate,
    handleDeleteTemplate,
    t,
  } = useTemplates({ initialTemplates });

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'variables'>('editor');

  // 🔹 Quan es crea una plantilla nova → canviem automàticament a l’editor
  const handleCreateTemplate = () => {
    handleNewTemplate();
    setActiveTab('editor');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col"
      >
        {/* 🔹 Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('pageTitle')}</h1>
          <div className="flex gap-2">
            <Button onClick={handleCreateTemplate} variant="outline" className="h-9 px-3">
              <Plus className="w-4 h-4 mr-1" />
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving || !selectedTemplate} className="h-9 px-4">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('saveButton')}
            </Button>
          </div>
        </div>

        {/* 💻 Layout Desktop */}
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr_280px] gap-6 flex-1 min-h-0">
          <TemplateList
            templates={templates}
            selectedTemplateId={selectedTemplate ? String(selectedTemplate.id) : null}
            onSelectTemplate={setSelectedTemplate}
            onNewTemplate={handleCreateTemplate}
            onSetTemplateToDelete={setTemplateToDelete}
          />
          <TemplateEditor
            selectedTemplate={selectedTemplate}
            onUpdateTemplate={setSelectedTemplate}
            onSave={handleSaveTemplate}
          />
          <TemplateVariables
            selectedTemplate={selectedTemplate}
            onVariablesChange={setDetectedVariables}
          />
        </div>

        {/* 📱 Layout Mobile */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col">
          <Tabs
            defaultValue="editor"
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value as 'list' | 'editor' | 'variables')}
            className="flex-1 flex flex-col"
          >
            {/* 🔹 TabsList responsive */}
            <TabsList className="grid grid-cols-3 gap-1 mb-2 w-full bg-muted rounded-lg text-xs sm:text-sm">
              <TabsTrigger value="list" className="flex items-center justify-center gap-1 py-2">
                <List className="w-4 h-4" /> {t('tabList')}
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center justify-center gap-1 py-2">
                <FileText className="w-4 h-4" /> {t('tabEditor')}
              </TabsTrigger>
              <TabsTrigger value="variables" className="flex items-center justify-center gap-1 py-2">
                <Variable className="w-4 h-4" /> {t('tabVariables')}
              </TabsTrigger>
            </TabsList>

            {/* 🔹 Contingut per pestanya */}
            <TabsContent value="list" className="flex-1 overflow-y-auto rounded-xl">
              <TemplateList
                templates={templates}
                selectedTemplateId={selectedTemplate ? String(selectedTemplate.id) : null}
                onSelectTemplate={setSelectedTemplate}
                onNewTemplate={handleCreateTemplate}
                onSetTemplateToDelete={setTemplateToDelete}
              />
            </TabsContent>

            <TabsContent value="editor" className="flex-1 min-h-0">
              <TemplateEditor
                selectedTemplate={selectedTemplate}
                onUpdateTemplate={setSelectedTemplate}
                onSave={handleSaveTemplate}
              />
            </TabsContent>

            <TabsContent value="variables" className="flex-1 overflow-y-auto">
              <TemplateVariables
                selectedTemplate={selectedTemplate}
                onVariablesChange={setDetectedVariables}
              />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {/* 🗑️ Confirmació d’eliminació */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? t('deletingButton') : t('confirmDeleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
