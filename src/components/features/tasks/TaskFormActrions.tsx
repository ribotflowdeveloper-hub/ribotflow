// src/components/features/tasks/TaskFormActions.tsx

'use client';

import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface FormActionsProps {
  isEditing: boolean;
  onSetViewMode: () => void;
  isPending: boolean;
}

export function FormActions({ isEditing, onSetViewMode, isPending }: FormActionsProps) {
  return (
    <div className="sm:justify-between mt-4 pt-4 border-t flex items-center justify-between">
      <div>
        {isEditing && (
          <Button type="button" variant="ghost" onClick={onSetViewMode} disabled={isPending}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tornar a la vista
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary" disabled={isPending}>
            Cancel·lar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending
            ? isEditing
              ? 'Guardant...'
              : 'Creant...'
            : isEditing
              ? 'Guardar Canvis'
              : 'Crear Tasca'}
        </Button>
      </div>
    </div>
  );
}