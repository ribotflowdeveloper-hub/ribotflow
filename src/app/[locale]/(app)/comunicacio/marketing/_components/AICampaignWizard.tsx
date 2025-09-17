"use client";

import React, { useState, useTransition, FC } from "react";
import { toast } from "sonner"; // ✅ 1. Importem 'toast' de sonner
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
// Framer Motion és una llibreria per a animacions. 'motion' permet animar components
// i 'AnimatePresence' gestiona les animacions d'entrada i sortida dels components.
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Wand2,
  Lightbulb,
  Users,
  ChevronLeft,
} from "lucide-react";
import { useTranslations } from 'next-intl';

// Aquestes són les Server Actions, funcions que s'executen de forma segura al servidor.
import {
  generateStrategiesAction,
  draftContentAction,
  saveCampaignAction,
} from "./actions";

// Definim les propietats que el component espera rebre del seu pare.
interface AICampaignWizardProps {
  open: boolean; // Controla si el diàleg és visible.
  onOpenChange: (open: boolean) => void; // Funció per notificar al pare que el diàleg es vol tancar/obrir.
  onCampaignCreated: () => void; // Funció de callback que s'executa quan una campanya es crea amb èxit.
}

// Tipus per a les estratègies de màrqueting que genera la IA.
interface Strategy {
  name: string;
  type: string;
  target_audience: string;
  description: string;
  content?: string; // El contingut del correu o publicació, és opcional al principi.
}

/**
 * Assistent multi-pas guiat per IA per a la creació de campanyes de màrqueting.
 * Aquest component gestiona l'estat dels diferents passos, les crides a les accions
 * d'IA i la interacció de l'usuari dins d'un diàleg modal.
 */
export const AICampaignWizard: FC<AICampaignWizardProps> = ({
  open,
  onOpenChange,
  onCampaignCreated,
}) => {
  // --- ESTATS DEL COMPONENT ---
  const [step, setStep] = useState(1); // Controla el pas actual de l'assistent (1, 2, o 3).
  const [goal, setGoal] = useState(""); // Emmagatzema l'objectiu de màrqueting de l'usuari.
  const [strategies, setStrategies] = useState<Strategy[]>([]); // Array per a les estratègies suggerides per la IA.
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null); // L'estratègia que l'usuari ha triat.
  const t = useTranslations('AICampaignWizard');

  // 'useTransition' és un hook de React per gestionar estats de càrrega sense bloquejar la UI.
  // 'isPending' serà cert mentre una acció (com una crida a la IA) s'està executant.
  const [isPending, startTransition] = useTransition();

  // Estat per saber quina estratègia s'està processant, per a una millor UX (només mostra un spinner).
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);

  /**
   * Funció per resetejar tots els estats de l'assistent a la seva configuració inicial.
   * Es crida quan el diàleg es tanca per assegurar que comenci de nou la pròxima vegada.
   */
  const resetWizard = () => {
    setStep(1);
    setGoal("");
    setStrategies([]);
    setSelectedStrategy(null);
    setProcessingIndex(null);
  };

  /**
   * Gestiona la crida a la IA per generar estratègies basades en l'objectiu de l'usuari.
   */
  const handleGenerateStrategies = () => {
    if (!goal.trim()) return; // No fa res si l'objectiu està buit.
    startTransition(async () => {
      const { data, error } = await generateStrategiesAction(goal);
      if (error) {
        toast.error(t('toastErrorAI'), { description: error });
      } else {
        setStrategies(data as Strategy[]);
        setStep(2); // Avança al següent pas.
      }
    });
  };

  /**
   * Gestiona la crida a la IA per redactar el contingut d'una estratègia específica.
   */
  const handleDraftContent = (strategy: Strategy, index: number) => {
    setProcessingIndex(index); // Marca quina targeta està processant per a la UI.
    startTransition(async () => {
      const { data, error } = await draftContentAction(goal, strategy);
      if (error) {
        toast.error(t('toastErrorAI'), { description: error });
      } else {
        // Guarda l'estratègia seleccionada juntament amb el nou contingut generat.
        setSelectedStrategy({ ...strategy, content: data as string });
        setStep(3); // Avança a l'últim pas.
      }
      setProcessingIndex(null); // Reseteja l'índex de processament.
    });
  };

  /**
   * Desa la campanya final a la base de dades.
   */
  const handleSaveCampaign = () => {
    if (!selectedStrategy) return;
    startTransition(async () => {
      const { error } = await saveCampaignAction(selectedStrategy, goal);
      if (error) {
        toast.error(t('toastErrorSave'), { description: t('toastErrorSaveDescription') });
      } else {
        toast.success(t('toastSuccessSave'), { description: t('toastSuccessSaveDescription') });

        onCampaignCreated(); // Notifica al component pare.
        onOpenChange(false); // Tanca el diàleg.
        resetWizard(); // Neteja l'estat per a la pròxima vegada.
      }
    });
  };

  /**
   * Funció que renderitza el contingut del diàleg segons el pas ('step') actual.
   * L'ús d'un 'switch' és una manera neta de gestionar múltiples vistes dins d'un component.
   */
  const renderStepContent = () => {
    switch (step) {
      // Pas 1: L'usuari introdueix el seu objectiu.

      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DialogDescription>{t('step1Description')}</DialogDescription>

            <Textarea
              placeholder={t('step1Placeholder')}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="my-4"
              rows={4}
            />
            <DialogFooter>
              <Button
                onClick={handleGenerateStrategies}
                disabled={isPending || !goal.trim()}
              >
                {isPending ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {t('generateStrategiesButton')}
              </Button>
            </DialogFooter>
          </motion.div>
        );
      // Pas 2: L'usuari tria una de les estratègies generades.

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DialogDescription>{t('step2Description')}</DialogDescription>

            <div className="my-4 space-y-3 max-h-[50vh] overflow-y-auto p-1">
              {strategies.map((s, i) => (
                <div
                  key={i}
                  className={`p-4 border border-border rounded-lg transition-all ${isPending && processingIndex !== i
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-primary cursor-pointer"
                    }`}
                  onClick={() => !isPending && handleDraftContent(s, i)}
                >
                  {isPending && processingIndex === i ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-primary" />{" "}
                      <span className="ml-2">Creant màgia...</span>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="text-yellow-400 h-4 w-4" /> {s.name} <Badge variant="outline" className={undefined}>{s.type}</Badge></h3>
                      <p className="text-sm text-muted-foreground mt-1"><Users className="inline h-4 w-4 mr-1" /> {s.target_audience}</p>
                      <p className="text-sm mt-2">{s.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> {t('backButton')}</Button>

            </DialogFooter>
          </motion.div>
        );
      // Pas 3: L'usuari edita i desa el contingut final.

      case 3:
        if (!selectedStrategy) return null;
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
                        <DialogDescription>{t('step3Description')}</DialogDescription>

            <div className="my-4 space-y-4">
              <Input
                value={selectedStrategy.name}
                onChange={(e) =>
                  setSelectedStrategy((s) =>
                    s ? { ...s, name: e.target.value } : null
                  )
                }
                className="text-lg font-bold"
              />
              <Textarea
                value={selectedStrategy.content ?? ""}
                onChange={(e) =>
                  setSelectedStrategy((s) =>
                    s ? { ...s, content: e.target.value } : null
                  )
                }
                className="h-[40vh] text-base"
              />
            </div>
              <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(2)}>{t('backButton')}</Button>
              <Button onClick={handleSaveCampaign} disabled={isPending}>{isPending && <Loader2 className="animate-spin mr-2" />} {t('saveCampaignButton')}</Button>
            </DialogFooter>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetWizard();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="glass-effect max-w-2xl min-h-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Wand2 className="text-primary" /> {t('title')}
          </DialogTitle>
          <div className="flex items-center pt-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                      }`}
                  >
                    {s}
                  </div>
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 transition-all ${step > s ? "bg-primary" : "bg-muted"
                      }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>
        {/* 'AnimatePresence' de Framer Motion gestiona les animacions quan el contingut de dins canvia.
            'mode="wait"' espera que l'animació de sortida acabi abans de començar la d'entrada. */}
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
