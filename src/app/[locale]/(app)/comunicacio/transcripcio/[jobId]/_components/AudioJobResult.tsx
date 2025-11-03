'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, ListPlus, MoreVertical, Trash2, Send, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'

import type { AudioJob } from '@/types/db'
// ✅ 1. Importem els nous components
import { JobStatusBadge } from '../../_components/JobStatusBadge'
import { FormattedTranscription } from '../../_components/FormattedTranscription'
import { ParticipantsList } from '../../_components/ParticipantsList'
import { CreateTaskDialog } from '../../_components/CreateTaskDialog'

interface AudioJobResultProps {
  initialJob: AudioJob
}

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
// ✅ NOU: Importem el nou flux
import { KeyMomentsFlow } from '../../_components/KeyMomentsFlow'
// ✅ NOU: Importem les accions
import { deleteAudioJobAction, sendTranscriptionSummaryEmailAction } from '../../actions'


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
          setJob(payload.new as AudioJob)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, job.id])


  // --- Gestors d'Accions ---

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.append('jobId', job.id);
      formData.append('storagePath', job.storage_path);
      formData.append('locale', locale);

      const result = await deleteAudioJobAction(formData);
      if (result?.error) {
        toast.error(t('deleteErrorTitle'), { description: result.error });
      }
      // Si té èxit, la Server Action ja fa un redirect()
    });
  };

  const handleSendEmail = () => {
    startEmailTransition(async () => {
      const formData = new FormData();
      formData.append('jobId', job.id);
      
      const result = await sendTranscriptionSummaryEmailAction(formData);

      if (result.error) {
        toast.error(t('sendEmailErrorTitle'), { description: result.error });
      } else {
        toast.success(t('sendEmailSuccessTitle'));
      }
    });
  };


  // --- Renderitzat ---

  return (
    <>
      {/* --- DIÀLEGS (ARA SÓN GLOBALS) --- */}
      
      {/* ✅ 1. Diàleg de creació de tasca (només s'usa en 'completed') */}
      <CreateTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        job={job}
        defaultValues={{
          summary: job.summary,
          transcription: job.transcription_text,
        }}
      />
      
      {/* ✅ 2. Diàleg d'esborrat (MOGUT A NIVELL SUPERIOR) */}
      {/* Ara es pot cridar des de 'completed' o 'failed' */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
      
      {/* 1. Estat Pendent o Processant */}
      {(job.status === 'pending' || job.status === 'processing') && (
        <Card className="max-w-2xl mx-auto text-center">
          <CardHeader>
            <CardTitle>{t('pendingTitle')}</CardTitle>
            <CardDescription>{t('pendingDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-4">
              <JobStatusBadge status={job.status} />
            </p>
          </CardContent>
        </Card>
      )}

      {/* ✅ 3. Estat Fallit (NOU LAYOUT AMB ACCIONS) */}
      {job.status === 'failed' && (
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

      {/* 4. Estat Completat (Sense canvis, ja utilitza els diàlegs globals) */}
      {job.status === 'completed' && (
        <div className="max-w-7xl mx-auto space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          
          {/* Columna Esquerra (Info i Accions) */}
          <div className="lg:col-span-1 space-y-6">
            <Alert variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t('completedTitle')}</AlertTitle>
              <AlertDescription>{t('completedDescription')}</AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{t('actionsTitle')}</CardTitle>
                <DropdownMenu>
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

          {/* Columna Dreta (Flux i Transcripció) */}
          <div className="lg:col-span-2 space-y-6">
            <KeyMomentsFlow moments={job.key_moments} />
            <Collapsible>
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
                    <FormattedTranscription text={job.transcription_text} />
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