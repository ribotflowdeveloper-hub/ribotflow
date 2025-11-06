// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/[jobId]/_components/AudioJobResult.tsx (FITXER COMPLET I CORREGIT)
'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, ListPlus, MoreVertical, Trash2, Send, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'

import type { AudioJob } from '@/types/db' // Aquest tipus ja hauria d'estar actualitzat gràcies al Pas 3
import { JobStatusBadge } from '../../_components/JobStatusBadge'
import { ParticipantsList } from '../../_components/ParticipantsList'
import { CreateTaskDialog } from '../../_components/CreateTaskDialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { KeyMomentsFlow } from '../../_components/KeyMomentsFlow'
import { DialogueFlowRenderer } from '../../_components/DialogueFlowRenderer' 
import { deleteAudioJobAction, sendTranscriptionSummaryEmailAction } from '../../actions'

// ✅ 1. IMPORTEM EL NOU COMPONENT
import { AssignedTasksSummary } from '../../_components/AssignedTasksSummary'

interface AudioJobResultProps {
  initialJob: AudioJob
}

export function AudioJobResult({ initialJob }: AudioJobResultProps) {
  const [job, setJob] = useState(initialJob)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSendingEmail, startEmailTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  const supabase = createSupabaseBrowserClient()
  const t = useTranslations('Transcripcio');
  const locale = useLocale();

  useEffect(() => {
    // ... (codi de useEffect idèntic)
     const channel = supabase
      .channel(`audio_job_${job.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audio_jobs',
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          console.log('Canvi rebut en temps real!', payload)
          setJob(payload.new as AudioJob) // El 'payload.new' ja tindrà el nou camp
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, job.id])


  // --- Gestors d'Accions (sense canvis) ---
  const handleDelete = () => { /* ... (idèntic) ... */ 
      startDeleteTransition(async () => {
      const formData = new FormData();
      formData.append('jobId', job.id);
      formData.append('storagePath', job.storage_path);
      formData.append('locale', locale);

      const result = await deleteAudioJobAction(formData);
      if (result?.error) {
        toast.error(t('deleteErrorTitle'), { description: result.error });
      }
    });
  };
  const handleSendEmail = () => { /* ... (idèntic) ... */ 
    startEmailTransition(async () => {
      const formData = new FormData();
      formData.append('jobId', job.id);
      const result = await sendTranscriptionSummaryEmailAction(formData);
      if (result?.error) {
        toast.error(t('sendEmailErrorTitle'), { description: result.error });
      } else {
        toast.success(t('sendEmailSuccessTitle'));
      }
    });
  };

  // --- Renderitzat ---
  return (
    <>
      {/* --- DIÀLEGS (Corregits amb els nous camps) --- */}
      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        job={job}
        defaultValues={{
          summary: job.summary,
          keyMoments: job.key_moments,
          dialogue: job.dialogue_flow,
          transcription: job.transcription_text,
        }}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        {/* ... (contingut del diàleg d'esborrat idèntic) ... */}
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
             <AlertDialogDescription>{t('deleteDialogDescription')}</AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel disabled={isDeleting}>{t('cancelButton')}</AlertDialogCancel>
             <AlertDialogAction
               onClick={handleDelete}
               disabled={isDeleting}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
               {t('deleteButtonConfirm')}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>

      {/* --- ESTATS DE RENDERITZAT --- */}
      {(job.status === 'pending' || job.status === 'processing') && (
        // ... (estat 'pending' idèntic) ...
        <Card className="max-w-2xl mx-auto text-center">
          <CardHeader>
            <CardTitle>{t('pendingTitle')}</CardTitle>
            <CardDescription>{t('pendingDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <div className="text-sm text-muted-foreground mt-4">
              <JobStatusBadge status={job.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {job.status === 'failed' && (
        // ... (estat 'failed' idèntic) ...
         <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t('failedTitle')}</AlertTitle>
            <AlertDescription>
              <p>{t('failedDescription')}</p>
              <pre className="mt-2 p-2 bg-background rounded text-sm whitespace-pre-wrap">
                {job.error_message || t('errorUnknown')}
              </pre>
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>{t('actionsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t('deleteButton')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Estat Completat (AMB CANVIS) */}
      {job.status === 'completed' && (
        <div className="max-w-7xl mx-auto space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">

          {/* Columna Esquerra (Info i Accions) */}
          <div className="lg:col-span-1 space-y-6">
            <Alert variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t('completedTitle')}</AlertTitle>
              <AlertDescription>{t('completedDescription')}</AlertDescription>
            </Alert>

            {/* ✅ 2. AFEGIM EL NOU RESUM DE TASQUES A LA UI */}
            <AssignedTasksSummary tasks={job.assigned_tasks_summary} />

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t('actionsTitle')}</CardTitle>
                <DropdownMenu>
                  {/* ... (menú d'accions idèntic) ... */}
                   <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isSendingEmail || isDeleting}>
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleSendEmail} disabled={isSendingEmail}>
                      {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {t('sendEmailButton')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('deleteButton')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setIsTaskDialogOpen(true)}>
                  <ListPlus className="mr-2 h-4 w-4" />
                  {t('createTaskButton')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('summaryTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{job.summary || t('summaryEmpty')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('participantsTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ParticipantsList participants={job.participants} />
              </CardContent>
            </Card>
          </div>

          {/* Columna Dreta (Flux i Transcripció) (sense canvis) */}
          <div className="lg:col-span-2 space-y-6">
            <KeyMomentsFlow moments={job.key_moments} />
            <Collapsible defaultOpen>
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer p-6">
                    <CardTitle>{t('fullTranscriptionTitle')}</CardTitle>
                    <Button variant="ghost" size="sm" className="w-9 p-0">
                      <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-180" />
                      <span className="sr-only">{t('toggleButton')}</span>
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <DialogueFlowRenderer flow={job.dialogue_flow} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      )}
    </>
  )
}