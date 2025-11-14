'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { createExpenseCategoryAction } from '../../actions';
import { type ExpenseCategory } from '@/types/finances/index';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated: (newCategory: ExpenseCategory) => void;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onCategoryCreated,
}: CreateCategoryDialogProps) {
  const t = useTranslations('ExpenseDetailPage.categories');
  const tShared = useTranslations('Shared');
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error(t('toast.nameRequired') || 'El nom és obligatori.');
      return;
    }

    startTransition(async () => {
      const result = await createExpenseCategoryAction(name, description || null);

      if (result.success && result.data) {
        toast.success(t('toast.createSuccess') || 'Categoria creada amb èxit.');
        onCategoryCreated(result.data); // Retornem la nova categoria al pare
        setName('');
        setDescription('');
        onOpenChange(false);
      } else {
        toast.error(result.message || t('toast.createError') || 'Error en crear la categoria.');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('newTitle') || 'Nova Categoria de Despesa'}</DialogTitle>
            <DialogDescription>
              {t('newDescription') || 'Les categories t\'ajuden a organitzar i filtrar les teves despeses.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{tShared('fields.name')}</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('placeholder.name') || 'Ex: Viatges'}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">{tShared('fields.description')}</Label>
              <Textarea
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('placeholder.description') || 'Ex: Despeses de transport, hotels...'}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                {tShared('actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {tShared('actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}