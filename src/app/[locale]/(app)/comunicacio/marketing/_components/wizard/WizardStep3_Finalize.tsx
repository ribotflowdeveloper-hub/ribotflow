// Ubicació: /app/(app)/comunicacio/marketing/_components/wizard/WizardStep3_Finalize.tsx

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2} from "lucide-react";
import type { SetStateAction } from 'react';

// ✅ CORRECCIÓ: Aquest tipus ha de ser el mateix que s'utilitza en el hook.
// Si Strategy té camps opcionals, els mantenim.
interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
    content?: string;
}

interface Props {
    // ✅ CORRECCIÓ: Fem servir el tipus 'Strategy' complet.
    strategy: Strategy;
    // ✅ CORRECCIÓ: El tipus ha de coincidir exactament.
    onStrategyChange: (value: SetStateAction<Strategy | null>) => void;
    onSave: () => void;
    onBack: () => void;
    isPending: boolean;
    t: (key: string) => string;
}

export const WizardStep3_Finalize = ({ strategy, onStrategyChange, onSave, onBack, isPending, t }: Props) => (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <DialogDescription>{t('step3Description')}</DialogDescription>

        <div className="my-4 space-y-4">
            <Input
                value={strategy.name}
                onChange={(e) => onStrategyChange(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="text-lg font-bold"
            />
            <Textarea
                value={strategy.content ?? ""}
                onChange={(e) => onStrategyChange(prev => prev ? { ...prev, content: e.target.value } : null)}
                className="h-[40vh] text-base"
            />
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={onBack}>{t('backButton')}</Button>
            <Button onClick={onSave} disabled={isPending}>
                {isPending && <Loader2 className="animate-spin mr-2" />} {t('saveCampaignButton')}
            </Button>
        </DialogFooter>
    </motion.div>
);