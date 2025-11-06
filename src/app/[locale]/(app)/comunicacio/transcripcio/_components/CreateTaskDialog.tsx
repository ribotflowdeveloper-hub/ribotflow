// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/CreateTaskDialog.tsx (FITXER COMPLET I CORREGIT)
'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { type Json } from '@/types/supabase' // ✅ 1. Importem Json
import type { AudioJob } from '@/types/db'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ContactSelector } from '@/components/features/contactes/ContactSelector'
import { createTaskFromTranscription } from '../actions'

// ✅ 2. DEFINIM EL TIPUS PER ALS VALORS PER DEFECTE
// Això soluciona l'error ts(2353)
interface TaskDefaultValues {
  summary: string | null
  keyMoments: Json | null // <-- Afegit
  dialogue: Json | null // <-- Afegit
  transcription: string | null
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: AudioJob
  defaultValues: TaskDefaultValues // <-- Utilitzem el tipus
}

// Esquema de Zod per al formulari
const taskSchema = z.object({
  title: z.string().min(3, 'El títol és necessari.'),
  description: z.string().optional(),
  contact_id: z.number().nullable(),
  project_id: z.string().uuid().nullable(),
})

export function CreateTaskDialog({ open, onOpenChange, job, defaultValues }: CreateTaskDialogProps) {
  const t = useTranslations('Transcripcio')
  const [isPending, startTransition] = useTransition()

  // Funció per extreure un text suggerit per a la tasca
  const getSuggestedDescription = () => {
    // Podríem buscar 'action_items' dins de 'keyMoments'
    // Per ara, fem servir el resum.
    return defaultValues.summary || defaultValues.transcription || ''
  }

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: getSuggestedDescription(),
      contact_id: null,
      project_id: job.project_id || null,
    },
  })

  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('title', values.title)
      formData.append('description', values.description || '')
      if (values.contact_id) {
        formData.append('contact_id', String(values.contact_id))
      }
      if (values.project_id) {
        formData.append('project_id', values.project_id)
      }
      formData.append('job_id', job.id)

      const result = await createTaskFromTranscription(formData)

      if (result.error) {
        toast.error(t('createTaskErrorTitle'), { description: result.error })
      } else {
        toast.success(t('createTaskSuccessTitle'))
        onOpenChange(false)
        form.reset()
      }
    })
  }
  
  // Obtenim els contactes participants des del 'job'
  const participantContacts = (job.participants as { contact_id: number; name: string }[])
    ?.map(p => ({ id: p.contact_id, nom: p.name })) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('createTaskButton')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Títol de la Tasca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Revisar plànols..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripció (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripció detallada..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignar a (Opcional)</FormLabel>
                  <FormControl>
                    <ContactSelector
                      contacts={participantContacts}
                      selectedId={field.value}
                      onSelect={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isPending}>
                  {t('cancelButton')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('createButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}