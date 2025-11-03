import { validatePageSession } from '@/lib/supabase/session'
import { PageHeader } from '@/components/shared/PageHeader'
import { getTeamContactsList } from '@/app/[locale]/(app)/crm/contactes/actions'
// ✅ El component ara està a la seva pròpia carpeta
import { AudioJobUploader } from './_components/AudioJobUploader'

export default async function AudioTranscriberPage() {
  // ✅ validatePageSession retorna l'ID de l'equip
  const { activeTeamId } = await validatePageSession()

  const contacts = await getTeamContactsList()

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Nova Transcripció"
        description="Puja un àudio i selecciona els participants per extreure tasques."
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* ✅ Passem el 'teamId' i els 'contacts' al client */}
        <AudioJobUploader contacts={contacts} teamId={activeTeamId} />
      </div>
    </div>
  )
}