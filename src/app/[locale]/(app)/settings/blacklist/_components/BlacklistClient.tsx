"use client";

import React, { useTransition, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState'; // ✅ REFACTORITZACIÓ: Component per a estat buit
import { addRuleAction, deleteRuleAction } from '../action';
import type { BlacklistRule } from '@/types/settings';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface BlacklistClientProps {
  initialRules: BlacklistRule[];
  currentUserRole: string | null;
}

/**
 * Component de Client per a la pàgina de la Blacklist.
 * S'encarrega de la interactivitat de la UI.
 */
export function BlacklistClient({ initialRules, currentUserRole }: BlacklistClientProps) {
  const t = useTranslations('SettingsPage.blacklist');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // ✅ REFACTORITZACIÓ: Variable de control per a la UI basada en permisos.
  const canManage = hasPermission(currentUserRole, PERMISSIONS.MANAGE_BLACKLIST);

  const handleAddSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await addRuleAction(formData);
      // ✅ REFACTORITZACIÓ: Missatges de toast més específics.
      if (result.success) {
        toast.success(t('toast.addSuccess'), { description: result.message });
        formRef.current?.reset();
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteRuleAction(id);
      if (result.success) {
        toast.success(t('toast.deleteSuccess'), { description: result.message });
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
      {/* ✅ REFACTORITZACIÓ: El formulari es deshabilita si l'usuari no té permisos. */}
      <form ref={formRef} action={handleAddSubmit} className="flex gap-2 mb-6">
        <Input name="newRule" placeholder={t('placeholder')} required disabled={isPending || !canManage} />
        <Button type="submit" disabled={isPending || !canManage}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('addButton')}
        </Button>
      </form>

      <div className="space-y-2">
        {initialRules.length > 0 ? initialRules.map(rule => (
          <div key={rule.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={rule.rule_type === 'domain' ? 'default' : 'secondary'}>{rule.rule_type}</Badge>
              <span className="break-all">{rule.value}</span>
            </div>
            {/* ✅ REFACTORITZACIÓ: El botó d'eliminar es mostra/oculta segons els permisos. */}
            {canManage && (
              <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} disabled={isPending}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        )) : (
          !isPending && <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        )}
      </div>
    </motion.div>
  );
}
