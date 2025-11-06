import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PipelineData } from './_components/PipelineData';
import { PipelineSkeleton } from './_components/PipelineSkeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline | Ribot',
};

interface PipelinePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PipelinePage(props: PipelinePageProps) {
  
  const searchParams = await props.searchParams;

  return (
    <Suspense fallback={<PipelineSkeleton stages={[]} viewMode="columns" />}>
      <PipelineData searchParams={searchParams} />
    </Suspense>
  );
}
