// Ubicació: /app/(app)/comunicacio/marketing/_components/wizard/WizardStep2_SelectStrategy.tsx

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb, Users, ChevronLeft } from "lucide-react";

// El tipus 'Strategy' hauria d'estar en un fitxer compartit, però el definim aquí per claredat.
interface Strategy {
    name: string;
    type: string;
    target_audience: string;
    description: string;
}

interface Props {
    strategies: Strategy[];
    onSelect: (strategy: Strategy, index: number) => void;
    onBack: () => void;
    isPending: boolean;
    processingIndex: number | null;
    t: (key: string) => string;
}

export const WizardStep2_SelectStrategy = ({ strategies, onSelect, onBack, isPending, processingIndex, t }: Props) => (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <DialogDescription>{t('step2Description')}</DialogDescription>

        <div className="my-4 space-y-3 max-h-[50vh] overflow-y-auto p-1">
            {strategies.map((s, i) => (
                <div
                    key={i}
                    className={`p-4 border border-border rounded-lg transition-all ${isPending && processingIndex !== i ? "opacity-50 cursor-not-allowed" : "hover:border-primary cursor-pointer"}`}
                    onClick={() => !isPending && onSelect(s, i)}
                >
                    {isPending && processingIndex === i ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-primary" />
                            <span className="ml-2">{t('creatingMagic')}</span>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-semibold flex items-center gap-2">
                                <Lightbulb className="text-yellow-400 h-4 w-4" /> {s.name} <Badge variant="outline" className={undefined}>{s.type}</Badge>
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                <Users className="inline h-4 w-4 mr-1" /> {s.target_audience}
                            </p>
                            <p className="text-sm mt-2">{s.description}</p>
                        </>
                    )}
                </div>
            ))}
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={onBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> {t('backButton')}
            </Button>
        </DialogFooter>
    </motion.div>
);