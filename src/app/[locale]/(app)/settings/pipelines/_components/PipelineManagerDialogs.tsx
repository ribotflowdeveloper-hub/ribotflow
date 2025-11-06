"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type PipelineWithStages } from './SettingsPipelinesData';

type Stage = PipelineWithStages['pipeline_stages'][0];

interface PipelineManagerDialogsProps {
  isPending: boolean;
  deletingPipeline: PipelineWithStages | null;
  setDeletingPipeline: (pipeline: PipelineWithStages | null) => void;
  handleConfirmDeletePipeline: () => void;
  deletingStage: Stage | null;
  setDeletingStage: (stage: Stage | null) => void;
  handleConfirmDeleteStage: () => void;
}

export function PipelineManagerDialogs({
  isPending,
  deletingPipeline,
  setDeletingPipeline,
  handleConfirmDeletePipeline,
  deletingStage,
  setDeletingStage,
  handleConfirmDeleteStage,
}: PipelineManagerDialogsProps) {
  const t = useTranslations('SettingsPage.SettingsPipelines');

  return (
    <>
      <AlertDialog open={!!deletingPipeline} onOpenChange={(open) => !open && setDeletingPipeline(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeletePipelineTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {/* ✅ CORRECCIÓ: Afegim '|| ""' per evitar 'undefined' */}
              {t('confirmDeletePipelineDesc', { name: deletingPipeline?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeletePipeline} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteStageTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {/* ✅ CORRECCIÓ: Afegim '|| ""' per evitar 'undefined' */}
              {t('confirmDeleteStageDesc', { name: deletingStage?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteStage} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}