import { validatePageSession } from '@/lib/supabase/session'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAudioJobDetails } from '../actions'
import { AudioJobResult } from './_components/AudioJobResult'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal, ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// ✅ CANVI 1: El tipus de 'params' torna a ser una Promise.
interface AudioJobPageProps {
  params: Promise<{ 
    jobId: string
  }>;
}

export default async function AudioJobPage(props: AudioJobPageProps) {
  // ✅ CANVI 2: Resolem 'params' amb 'await' abans d'utilitzar-lo.
  const params = await props.params; 
  
  // 1. Validar sessió
  await validatePageSession()
  const t = await getTranslations('Transcripcio'); 

  // 2. Obtenir les dades inicials de la feina
  const { data: initialJob, error } = await getAudioJobDetails(params.jobId) // <--- Ara 'params' és l'objecte resolt

  if (error || !initialJob) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <Terminal className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {t('errorLoading')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t('detailTitle')}
        description={t('detailDescription', { jobId: params.jobId })} // <--- Ara 'params' és l'objecte resolt
      >
        <Link href="/comunicacio/transcripcio" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToListButton')}
          </Button>
        </Link>
      </PageHeader>
      <div >
        <AudioJobResult initialJob={initialJob} />
      </div>
    </div>
  )
}