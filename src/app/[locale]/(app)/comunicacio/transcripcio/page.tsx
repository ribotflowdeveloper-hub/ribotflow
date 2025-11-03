import { validatePageSession } from '@/lib/supabase/session'
import { PageHeader } from '@/components/shared/PageHeader'
import { getTeamAudioJobs } from './actions'
import { AudioJobsList } from './_components/AudioJobsList' // El crearem ara
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

export default async function TranscripcioListPage() {
  await validatePageSession()

  const { data: jobs, error } = await getTeamAudioJobs()

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
        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {jobs && <AudioJobsList initialJobs={jobs} />}
      </div>
    </div>
  )
}