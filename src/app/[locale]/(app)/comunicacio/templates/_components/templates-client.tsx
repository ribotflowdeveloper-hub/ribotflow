"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, List, FileText, Variable, Plus, Lock, Link, TriangleAlert } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useTemplates } from '../_hooks/useTemplates';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 3. Importem el tipus de límit
import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { TemplateVariables } from './TemplateVariables';
import type { EmailTemplate } from '@/types/db';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ 2. Importem Tooltip
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
interface TemplatesClientProps {
  initialTemplates: EmailTemplate[];
  limitStatus: UsageCheckResult; // ✅ 4. Afegim la nova prop
}

export function TemplatesClient({ initialTemplates, limitStatus }: TemplatesClientProps) {
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
    t_billing, // ✅ 5. Obtenim 't_billing' des del hook
  } = useTemplates({ initialTemplates, limitStatus }); // ✅ 6. Passem el límit al hook

  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'variables'>('editor');

  // ✅ 7. Calculem si el límit s'ha assolit
  const isLimitReached = !limitStatus.allowed;

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
        {/* 🔹 Header responsive */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0 flex-shrink-0">
          <h1 className="text-xl sm:text-3xl font-bold">{t('pageTitle')}</h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">


            {/* Botó Nou + Guardar */}
            <div className="flex gap-2">
              {/* ALARMA DE LÍMIT SUPERAT */}
              {isLimitReached && (
                <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 sm:p-3">
                  <TriangleAlert className="h-4 w-4 text-yellow-900" />
                  <AlertTitle className="font-semibold text-sm sm:text-base">
                    {t_billing('limitReachedTitle', { default: 'Límit assolit' })}
                  </AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm">
                    {limitStatus.error || t_billing('limitReachedDefault')}
                    <Button asChild variant="link" size="sm" className="px-1 h-auto py-0 text-yellow-900 font-semibold">
                      <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={isLimitReached ? 0 : -1} className={isLimitReached ? "inline-block" : ""}>
                      <Button
                        onClick={handleCreateTemplate}
                        variant="outline"
                        className="h-9 px-3"
                        disabled={isLimitReached}
                      >
                        {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isLimitReached && (
                    <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-yellow-900" />
                          <h3 className="font-semibold text-black">{t_billing('limitReachedTitle')}</h3>
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

              <Button
                onClick={handleSaveTemplate}
                disabled={isSaving || !selectedTemplate}
                className="h-9 px-3"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('saveButton')}
              </Button>
            </div>
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
            limitStatus={limitStatus} // ✅ 9. Passem el límit a la llista
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

            {/* 📄 Llista de plantilles */}
            <TabsContent value="list" className="flex-1 overflow-y-auto rounded-xl">
              <TemplateList
                templates={templates}
                selectedTemplateId={selectedTemplate ? String(selectedTemplate.id) : null}
                onSelectTemplate={(template) => {
                  setSelectedTemplate(template);
                  // 👇 Canvia automàticament a l'editor quan selecciones una plantilla
                  if (window.innerWidth < 1024) setActiveTab('editor');
                }}
                onNewTemplate={handleCreateTemplate}
                onSetTemplateToDelete={setTemplateToDelete}
                limitStatus={limitStatus}
              />
            </TabsContent>

            {/* ✏️ Editor de contingut */}
            <TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden rounded-xl">
              <TemplateEditor
                selectedTemplate={selectedTemplate}
                onUpdateTemplate={setSelectedTemplate}
                onSave={handleSaveTemplate}
              />
            </TabsContent>

            {/* 🧩 Variables */}
            <TabsContent value="variables" className="flex-1 min-h-0 overflow-auto rounded-xl">
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
