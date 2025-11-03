import { validatePageSession } from '@/lib/supabase/session'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAudioJobDetails } from '../actions'
import { AudioJobResult } from './_components/AudioJobResult'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

// Tipus per als paràmetres de la pàgina
interface AudioJobPageProps {
  params: {
    jobId: string
  }
}

export default async function AudioJobPage({ params }: AudioJobPageProps) {
  // 1. Validar sessió
  await validatePageSession()

  // 2. Obtenir les dades inicials de la feina
  const { data: initialJob, error } = await getAudioJobDetails(params.jobId)

  if (error || !initialJob) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No s'ha pogut carregar la feina de transcripció o no hi tens accés.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Resultat de la Transcripció"
        description={`Estat de la feina: ${params.jobId}`}
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* 3. Passem les dades inicials al component client */}
        <AudioJobResult initialJob={initialJob} />
      </div>
    </div>
  )
}