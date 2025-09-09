"use client";

import React, { useState, useTransition, FC } from "react";
import { useToast } from "@/components/ui/use-toast";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Wand2,
  Lightbulb,
  Users,
  ChevronLeft,
} from "lucide-react";
import {
  generateStrategiesAction,
  draftContentAction,
  saveCampaignAction,
} from "./actions";

interface AICampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated: () => void;
}

interface Strategy {
  name: string;
  type: string;
  target_audience: string;
  description: string;
  content?: string;
}

export const AICampaignWizard: FC<AICampaignWizardProps> = ({
  open,
  onOpenChange,
  onCampaignCreated,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);

  const resetWizard = () => {
    setStep(1);
    setGoal("");
    setStrategies([]);
    setSelectedStrategy(null);
    setProcessingIndex(null);
  };

  const handleGenerateStrategies = () => {
    if (!goal.trim()) return;
    startTransition(async () => {
      const { data, error } = await generateStrategiesAction(goal);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error d'IA",
          description: error,
        });
      } else {
        setStrategies(data as Strategy[]);
        setStep(2);
      }
    });
  };

  const handleDraftContent = (strategy: Strategy, index: number) => {
    setProcessingIndex(index);
    startTransition(async () => {
      const { data, error } = await draftContentAction(goal, strategy);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error d'IA",
          description: error,
        });
      } else {
        setSelectedStrategy({ ...strategy, content: data as string });
        setStep(3);
      }
      setProcessingIndex(null);
    });
  };

  const handleSaveCampaign = () => {
    if (!selectedStrategy) return;
    startTransition(async () => {
      const { error } = await saveCampaignAction(selectedStrategy, goal);
      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No s'ha pogut desar la campanya.",
        });
      } else {
        toast({
          title: "Campanya Creada!",
          description: "La teva nova campanya està a la llista.",
        });
        onCampaignCreated();
        onOpenChange(false);
        resetWizard();
      }
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DialogDescription>
              Comença descrivint el teu objectiu de màrqueting. Sigues específic!
            </DialogDescription>
            <Textarea
              placeholder="Ex: Vull aconseguir 3 nous clients per al meu servei de consultoria aquest mes a través d'Instagram."
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
                Generar Estratègies
              </Button>
            </DialogFooter>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DialogDescription>
              Hem generat algunes idees per a tu. Tria la que més t'agradi per
              desenvolupar el contingut.
            </DialogDescription>
            <div className="my-4 space-y-3 max-h-[50vh] overflow-y-auto p-1">
              {strategies.map((s, i) => (
                <div
                  key={i}
                  className={`p-4 border border-border rounded-lg transition-all ${
                    isPending && processingIndex !== i
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
                      <h3 className="font-semibold flex items-center gap-2">
                        <Lightbulb className="text-yellow-400 h-4 w-4" />{" "}
                        {s.name} <Badge variant="outline" className={undefined}>{s.type}</Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        <Users className="inline h-4 w-4 mr-1" />
                        {s.target_audience}
                      </p>
                      <p className="text-sm mt-2">{s.description}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Enrere
              </Button>
            </DialogFooter>
          </motion.div>
        );
      case 3:
        if (!selectedStrategy) return null;
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DialogDescription>
              Perfecte! Aquí tens un esborrany. Pots editar-lo abans de desar la
              campanya.
            </DialogDescription>
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
              <Button variant="ghost" onClick={() => setStep(2)}>
                Enrere
              </Button>
              <Button onClick={handleSaveCampaign} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                Desar Campanya
              </Button>
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
            <Wand2 className="text-primary" /> Assistent de Campanyes d'IA
          </DialogTitle>
          <div className="flex items-center pt-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      step >= s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {s}
                  </div>
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-0.5 transition-all ${
                      step > s ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
