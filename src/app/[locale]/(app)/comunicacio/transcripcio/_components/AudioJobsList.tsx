'use client'

import React, { useState, useEffect } from 'react'
import { type Database } from '@/types/supabase'
import { createClient as createSupabaseBrowserClient} from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ca } from 'date-fns/locale'

type AudioJob = Pick<Database['public']['Tables']['audio_jobs']['Row'], 
  'id' | 'created_at' | 'status' | 'summary' | 'error_message'
>

export function AudioJobsList({ initialJobs }: { initialJobs: AudioJob[] }) {
  const [jobs, setJobs] = useState(initialJobs)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Escolta TOTS els canvis a la taula 'audio_jobs'
    const channel = supabase
      .channel('audio_jobs_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_jobs' },
        (payload) => {
          console.log('Canvi rebut a la llista:', payload)
          // Actualitzem la llista quan hi ha canvis
          // (Això es pot optimitzar, però de moment refresquem)
          if (payload.eventType === 'INSERT') {
            setJobs((prevJobs) => [payload.new as AudioJob, ...prevJobs])
          }
          if (payload.eventType === 'UPDATE') {
            setJobs((prevJobs) =>
              prevJobs.map((job) =>
                job.id === payload.old.id ? (payload.new as AudioJob) : job
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (jobs.length === 0) {
    return <p className='text-center text-muted-foreground'>No hi ha cap transcripció.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <Link href={`/comunicacio/transcripcio/${job.id}`} key={job.id} passHref>
          <Card className="hover:border-primary/50 transition-colors h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Feina d'Àudio</span>
                <JobStatusBadge status={job.status} />
              </CardTitle>
              <CardDescription>
                Creat {formatDistanceToNow(new Date(job.created_at!), { addSuffix: true, locale: ca })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {job.status === 'completed' && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {job.summary || 'Completat sense resum.'}
                </p>
              )}
              {job.status === 'failed' && (
                <p className="text-sm text-destructive line-clamp-3">
                  {job.error_message || 'Error desconegut'}
                </p>
              )}
              {(job.status === 'pending' || job.status === 'processing') && (
                <p className="text-sm text-muted-foreground">
                  La transcripció està en progrés...
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Veure Detalls
              </Button>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function JobStatusBadge({ status }: { status: AudioJob['status'] }) {
  if (status === 'completed') {
    return <Badge variant="success" className={undefined}><CheckCircle className="mr-1 h-3 w-3" /> Completat</Badge>
  }
  if (status === 'failed') {
    return <Badge variant="destructive" className={undefined}><XCircle className="mr-1 h-3 w-3" /> Fallit</Badge>
  }
  return <Badge variant="outline" className={undefined}><Loader2 className="mr-1 h-3 w-3 animate-spin" /> En progrés</Badge>
}