"use client";

import React, { useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
// Importem les Server Actions que aquest component cridarà.
import { addRuleAction, deleteRuleAction } from '../action';
import { motion } from 'framer-motion';

// Tipus de dades per a una regla de la blacklist.
type Rule = { id: string; value: string; rule_type: 'email' | 'domain' };

/**
 * Component de Client per a la pàgina de la Blacklist.
 * S'encarrega de tota la interactivitat:
 * - Mostrar la llista de regles rebuda del servidor.
 * - Gestionar el formulari per afegir noves regles.
 * - Gestionar l'eliminació de regles existents.
 */
export function BlacklistClient({ initialRules }: { initialRules: Rule[] }) {
    // 'useTransition' per a estats de càrrega no bloquejants. 'isPending' serà cert
    // mentre s'executa una acció (afegir o eliminar).
    const [isPending, startTransition] = useTransition();
    // 'useRef' ens dona accés directe a un element del DOM, en aquest cas el formulari,
    // per poder resetejar-lo després d'afegir una regla.
    const formRef = useRef<HTMLFormElement>(null);

    /**
     * Gestiona l'enviament del formulari per afegir una nova regla.
     * Crida la Server Action 'addRuleAction'.
     */
    const handleAddSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await addRuleAction(formData);
            if (result.success) {
                toast.success('Èxit!', { description: result.message });
                // Si té èxit, reseteja el contingut del camp de text.
                formRef.current?.reset();
            } else {
                toast.error('Error', { description: result.message });
            }
        });
    };

    /**
     * Gestiona l'eliminació d'una regla existent.
     * Crida la Server Action 'deleteRuleAction'.
     */
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
            
            {/* El formulari crida directament a 'handleAddSubmit'. L'atribut 'action' de React
                permet connectar formularis a funcions que gestionen 'FormData'. */}
            <form ref={formRef} action={handleAddSubmit} className="flex gap-2 mb-6">
                <Input name="newRule" placeholder="exemple.com o spammer@exemple.com" required disabled={isPending} />
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Afegir'}
                </Button>
            </form>

            {/* Llista de regles existents */}
            <div className="space-y-2">
                {initialRules.length > 0 ? initialRules.map(rule => (
                    <div key={rule.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            {/* La 'Badge' canvia d'estil segons si és un domini o un email. */}
                            <Badge variant={rule.rule_type === 'domain' ? 'default' : 'secondary'} className={undefined}>{rule.rule_type}</Badge>
                            <span>{rule.value}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} disabled={isPending}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    </div>
                )) : (
                    // Missatge que es mostra només si no hi ha regles i no s'està processant cap acció.
                    !isPending && <p className="text-sm text-muted-foreground text-center py-4">La teva blacklist està buida.</p>
                )}
            </div>
        </motion.div>
    );
}