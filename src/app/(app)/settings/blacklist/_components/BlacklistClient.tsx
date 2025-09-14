"use client";

import React, { useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { addRuleAction, deleteRuleAction } from '../action';
import { motion } from 'framer-motion';

type Rule = { id: string; value: string; rule_type: 'email' | 'domain' };

export function BlacklistClient({ initialRules }: { initialRules: Rule[] }) {

  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleAddSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await addRuleAction(formData);
      if (result.success) {
        toast.success('Èxit!', { description: result.message });
        formRef.current?.reset();
      } else {
        toast.error('Error', { description: result.message });
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteRuleAction(id);
       if (result.success) {
        toast.success('Èxit!', { description: result.message });
      } else {
        toast.error('Error', { description: result.message });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
      <p className="text-muted-foreground mb-6">Afegeix dominis (ex: `exemple.com`) o adreces de correu completes per evitar que apareguin a la teva bústia d'entrada.</p>
      
      <form ref={formRef} action={handleAddSubmit} className="flex gap-2 mb-6">
        <Input name="newRule" placeholder="exemple.com o spammer@exemple.com" required disabled={isPending} />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Afegir'}
        </Button>
      </form>

      <div className="space-y-2">
        {initialRules.length > 0 ? initialRules.map(rule => (
          <div key={rule.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={rule.rule_type === 'domain' ? 'default' : 'secondary'} className={undefined}>{rule.rule_type}</Badge>
              <span>{rule.value}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} disabled={isPending}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )) : (
          !isPending && <p className="text-sm text-muted-foreground text-center py-4">La teva blacklist està buida.</p>
        )}
      </div>
    </motion.div>
  );
}
