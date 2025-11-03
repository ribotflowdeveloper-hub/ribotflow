// src/app/[locale]/(app)/comunicacio/transcripcio/page.tsx
import { validatePageSession } from '@/lib/supabase/session'
import { PageHeader } from '@/components/shared/PageHeader'
import { getTeamAudioJobs } from '@/lib/services/comunicacio/transcripcio.service' 
import { AudioJobsList } from './_components/AudioJobsList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
// ✅ CANVI: Importem el tipus directament des de la font original.
import type { AudioJob } from '@/types/db'

export default async function TranscripcioListPage() {
  // ... (la resta de la funció es manté igual) ...
  const session = await validatePageSession()
  if ('error' in session) {
      return null;
  }
  const { supabase, activeTeamId } = session;

  let initialJobs: Pick<AudioJob, 'id' | 'created_at' | 'status' | 'summary' | 'error_message'>[] = [];
  let fetchError: string | null = null;

  try {
    initialJobs = await getTeamAudioJobs(supabase, activeTeamId);
  } catch (error) {
    fetchError = (error as Error).message;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Transcripcions d'Àudio"
        description="Gestiona les teves gravacions i tasques extretes."
      >
        <Link href="/comunicacio/transcripcio/new" passHref>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transcripció
          </Button>
        </Link>
      </PageHeader>
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {fetchError && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}
        <AudioJobsList initialJobs={initialJobs} />
      </div>
    </div>
  )
}