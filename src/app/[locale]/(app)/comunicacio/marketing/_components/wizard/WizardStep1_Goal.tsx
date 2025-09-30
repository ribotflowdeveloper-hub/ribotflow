// Ubicació: /app/(app)/comunicacio/marketing/_components/wizard/WizardStep1_Goal.tsx

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
    goal: string;
    setGoal: (value: string) => void;
    onGenerate: () => void;
    isPending: boolean;
    t: (key: string) => string;
}

export const WizardStep1_Goal = ({ goal, setGoal, onGenerate, isPending, t }: Props) => (
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <DialogDescription>{t('step1Description')}</DialogDescription>
        <Textarea
            placeholder={t('step1Placeholder')}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="my-4"
            rows={4}
        />
        <DialogFooter>
            <Button onClick={onGenerate} disabled={isPending || !goal.trim()}>
                {isPending ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {t('generateStrategiesButton')}
            </Button>
        </DialogFooter>
    </motion.div>
);