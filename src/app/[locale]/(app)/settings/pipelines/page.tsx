import { Suspense } from 'react';
import { SettingsPipelinesData } from './_components/SettingsPipelinesData';
// TODO: Crear un SettingsPipelinesSkeleton
// import { SettingsPipelinesSkeleton } from './_components/SettingsPipelinesSkeleton';

export default async function SettingsPipelinesPage() {
  return (
    <Suspense fallback={<div>Carregant configuració de pipelines...</div>}>
      <SettingsPipelinesData />
    </Suspense>
  );
}