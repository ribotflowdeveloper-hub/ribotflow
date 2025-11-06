// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/page.tsx (FITXER COMPLET I CORREGIT)
import { Suspense } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TranscripcioData } from '../_components/TranscripcioData'
import { TranscripcioSkeleton } from '../_components/TranscripcioSkeleton'

export default async function AudioTranscriberPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Transcripcions d'Àudio"
        description="Puja un àudio i selecciona els participants per extreure tasques."
      />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Suspense fallback={<TranscripcioSkeleton />}>
          <TranscripcioData />
        </Suspense>
      </div>
    </div>
  )
}