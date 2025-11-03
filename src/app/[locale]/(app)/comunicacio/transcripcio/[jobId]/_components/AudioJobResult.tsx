'use client'

import React, { useState, useEffect } from 'react'
import { createClient as createSupabaseBrowserClient} from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

// Definim el tipus per a la feina, basat en el que retorna la BD
type AudioJob = Database['public']['Tables']['audio_jobs']['Row']

interface AudioJobResultProps {
  initialJob: AudioJob
}

export function AudioJobResult({ initialJob }: AudioJobResultProps) {
  const [job, setJob] = useState(initialJob)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Escolta canvis a la taula 'audio_jobs' per a AQUESTA feina en concret
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

    // Netejar la subscripció quan el component es desmunta
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, job.id])

  // 1. Estat Pendent o Processant
  if (job.status === 'pending' || job.status === 'processing') {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
          <CardTitle>Processant...</CardTitle>
          <CardDescription>
            El teu àudio s'està analitzant. Això pot trigar uns minuts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground mt-4">
            Estat actual: {job.status}
          </p>
        </CardContent>
      </Card>
    )
  }

  // 2. Estat Fallit
  if (job.status === 'failed') {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error de Processament</AlertTitle>
        <AlertDescription>
          <p>Hi ha hagut un error en processar l'àudio:</p>
          <pre className="mt-2 p-2 bg-background rounded text-sm">
            {job.error_message || 'Error desconegut'}
          </pre>
        </AlertDescription>
      </Alert>
    )
  }

  // 3. Estat Completat
  if (job.status === 'completed') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert variant="default">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Procés Completat</AlertTitle>
          <AlertDescription>
            L'àudio ha estat analitzat i les tasques s'han generat.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Resum de la Reunió</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert">
            <p>{job.summary || 'No s\'ha generat cap resum.'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transcripció Completa</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              readOnly
              value={job.transcription_text || 'No s\'ha generat cap transcripció.'}
              className="w-full h-64 p-2 border rounded-md bg-muted/50"
            />
          </CardContent>
        </Card>

        {/* Proper pas: Mostrar les tasques generades */}
        {/* <Card> ... Llista de tasques ... </Card> */}
      </div>
    )
  }

  return null // Per a estats desconeguts
}