// src/app/[locale]/(app)/settings/blacklist/_components/BlacklistClient.tsx

"use client";

import React, { useState, useTransition, useRef, useMemo } from 'react'; // Afegim useState i useMemo
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Trash2, Search } from 'lucide-react'; // Afegim Search

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // Importem Card
import { EmptyState } from '@/components/shared/EmptyState';
import { addRuleAction, deleteRuleAction } from '../action';
import type { BlacklistRule } from '@/types/settings';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/permissions.config';

interface BlacklistClientProps {
  initialRules: BlacklistRule[];
  currentUserRole: Role | null;
}

// Variants per a l'animació dels items (opcional, per a més dinamisme)
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05, // Delay petit per a cada item
    },
  }),
  exit: { opacity: 0, y: -10 }, // Animació en eliminar (necessita AnimatePresence)
};


export function BlacklistClient({ initialRules, currentUserRole }: BlacklistClientProps) {
  const t = useTranslations('SettingsPage.blacklist');
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [searchTerm, setSearchTerm] = useState(''); // ✅ Estat per al cercador

  const canManage = hasPermission(currentUserRole, PERMISSIONS.MANAGE_BLACKLIST);

  // ✅ Filtrem les regles basant-nos en el searchTerm
  const filteredRules = useMemo(() => {
    if (!searchTerm) {
      return initialRules;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    return initialRules.filter(rule =>
      rule.value.toLowerCase().includes(lowerCaseSearch) ||
      rule.rule_type.toLowerCase().includes(lowerCaseSearch)
    );
  }, [initialRules, searchTerm]);

  const handleAddSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await addRuleAction(formData);
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
        // Nota: L'eliminació visual depèn de la revalidació del Server Component pare
      } else {
        toast.error(t('toast.error'), { description: result.message });
      }
    });
  };

  return (
    // ✅ Utilitzem Card en lloc de motion.div + glass-card
    <Card>
      <CardHeader>
        {/* Opcional: Podem moure el títol/descripció aquí si ho treiem del Server Component */}
        {/* <CardTitle>{t('cardTitle')}</CardTitle> */}
        {/* <CardDescription>{t('cardDescription')}</CardDescription> */}
        <div className="relative">
          {/* Formulari per afegir */}
          <form ref={formRef} action={handleAddSubmit} className="flex flex-col sm:flex-row gap-2 pt-4">
            {/* ✅ Input de Cerca */}

            <Search className="absolute left-3 translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9" // Padding esquerre per a la icona
              disabled={isPending}
            />

            <Input
              name="newRule"
              placeholder={t('placeholder')}
              required
              disabled={isPending || !canManage}
              className="flex-grow"
            />
            <Button type="submit" disabled={isPending || !canManage} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('addButton')}
            </Button>
          </form>

        </div>
      </CardHeader>
      <CardContent>
        {/* ✅ Llista en 2 columnes (en pantalles mitjanes i grans) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRules.length > 0 ? filteredRules.map((rule, index) => (
            // Opcional: Podem animar cada item individualment
            <motion.div
              key={rule.id}
              layout // Anima canvis de posició (requereix AnimatePresence si animem 'exit')
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              custom={index} // Passa l'index per al delay escalonat
              className="flex justify-between items-center p-3 bg-muted/50 dark:bg-muted/20 rounded-lg border border-border/50"
            >
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <Badge variant={rule.rule_type === 'domain' ? 'default' : 'secondary'} className={undefined}>
                  {rule.rule_type}
                </Badge>
                {/* Trunca el text si és molt llarg */}
                <span className="text-sm truncate" title={rule.value}>{rule.value}</span>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(rule.id)}
                  disabled={isPending}
                  className="flex-shrink-0 w-8 h-8" // Mida més petita per al botó
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </motion.div>
          )) : (
            // Mostra estat buit si no hi ha resultats *després* de filtrar
            !isPending && (
              <div className="md:col-span-2"> {/* Ocupa les dues columnes */}
                <EmptyState message={searchTerm ? t('emptySearch') : t('emptyTitle')} />
              </div>
            )
          )}
        </div>
        {/* Si la llista original estava buida */}
        {initialRules.length === 0 && !searchTerm && !isPending && (
          <div className="mt-6">
            <EmptyState message={t('emptyTitle')} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}