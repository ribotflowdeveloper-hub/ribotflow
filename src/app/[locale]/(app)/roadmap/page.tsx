// Necessitem que la pàgina sigui un component client per gestionar l'estat del Dialog
"use client"; 

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Bot,
  ClipboardType,
  MailCheck,
  CheckCircle,
  TrendingUp,
  Save,
  Cpu,
  Workflow,
  Sparkles,
  Users,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";

// 1. Definim un tipus per a les nostres features
type Feature = {
  icon: React.ElementType;
  title: string;
  shortDescription: string;
  status: "En Planificació" | "Properament" | "En Investigació";
  // La nova secció de "diagrama"
  details: {
    what: {
      step: string;
      icon: React.ElementType;
    }[];
    why: {
      benefit: string;
      icon: React.ElementType;
    }[];
  };
};

// 2. Definim les dades amb el nou format
const features: Feature[] = [
  {
    icon: MailCheck,
    title: "Bústia Intel·ligent: Despeses Automàtiques",
    shortDescription:
      "Detecta factures en PDF/PNG des del teu correu i crea esborranys de despesa automàticament.",
    status: "En Planificació",
    details: {
      what: [
        { icon: Workflow, step: "Un proveïdor t'envia una factura al teu email connectat." },
        { icon: Cpu, step: "La nostra IA detecta el correu, l'obre i analitza el PDF o la imatge." },
        { icon: Sparkles, step: "Extreu les dades clau: proveïdor, import, impostos i data de venciment." },
        { icon: Save, step: "Es crea un esborrany de despesa a RibotFlow, llest per a la teva validació." },
      ],
      why: [
        { icon: TrendingUp, benefit: "Elimina el 90% de l'entrada manual de dades de despeses." },
        { icon: CheckCircle, benefit: "Mantén el control total: només has de revisar i aprovar." },
        { icon: Save, benefit: "No perdis mai més una factura en un fil de correu." },
      ],
    },
  },
  {
    icon: Wrench,
    title: "Mòdul SAT (Servei d'Assistència Tècnica)",
    shortDescription:
      "Gestió integral d'ordres de treball, tècnics, manteniments i reparacions.",
    status: "Properament",
    details: {
      what: [
        { icon: ClipboardType, step: "Crea Ordres de Treball (OT) per a incidències o manteniments." },
        { icon: Users, step: "Assigna tècnics a les OTs i planifica les seves rutes i agendes." },
        { icon: Wrench, step: "Registra materials, hores i costos directament a l'ordre de treball." },
        { icon: CheckCircle, step: "Tanca l'OT i converteix-la en una factura per al client amb un sol clic." },
      ],
      why: [
        { icon: TrendingUp, benefit: "Visió 360º de les operacions del teu equip de camp." },
        { icon: Workflow, benefit: "Integra perfectament el servei tècnic amb la facturació i el CRM." },
        { icon: Sparkles, benefit: "Ofereix un servei més ràpid i professional als teus clients." },
      ],
    },
  },
  {
    icon: Bot,
    title: "Agents IA: Integració WhatsApp i Telegram",
    shortDescription:
      "Automatitza la comunicació amb clients i consulta dades del CRM des del teu mòbil.",
    status: "En Investigació",
    details: {
      what: [
        { icon: MessageSquare, step: "Connecta els teus números de WhatsApp Business i Telegram a RibotFlow." },
        { icon: Cpu, step: "Entrena un Agent IA amb les teves dades per respondre preguntes freqüents." },
        { icon: Sparkles, step: "Permet a l'IA gestionar consultes de clients 24/7 (estat de projecte, horaris...)." },
        { icon: Users, step: "Consulta les teves pròpies dades ('Què dec a X?', 'Mostra'm el telèfon de Y')." },
      ],
      why: [
        { icon: TrendingUp, benefit: "Ofereix atenció al client instantània i redueix la càrrega de treball." },
        { icon: Save, benefit: "Centralitza totes les comunicacions amb clients dins la seva fitxa del CRM." },
        { icon: Workflow, benefit: "Gestiona el teu negoci des de qualsevol lloc, directament des del xat." },
      ],
    },
  },
  {
    icon: ClipboardType,
    title: "Constructor de Formularis Personalitzats",
    shortDescription:
      "Crea formularis de captació o enquestes que integren dades directament al teu CRM.",
    status: "Properament",
    details: {
      what: [
        { icon: Sparkles, step: "Editor visual 'drag-and-drop' per dissenyar formularis sense codi." },
        { icon: Workflow, step: "Publica el formulari a la teva web o comparteix-lo amb un enllaç directe." },
        { icon: Save, step: "Cada enviament de formulari es converteix automàticament en un nou Contacte." },
        { icon: TrendingUp, step: "Assigna els nous contactes a un 'pipeline' de vendes o una campanya." },
      ],
      why: [
        { icon: Users, benefit: "Automatitza la captació de 'leads' des de la teva pàgina web." },
        { icon: CheckCircle, benefit: "Recull l'opinió dels teus clients amb enquestes de satisfacció." },
        { icon: Cpu, benefit: "Elimina la necessitat d'eines externes com Typeform o Zapier." },
      ],
    },
  },
];

export default function RoadmapPage() {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Properament a RibotFlow"
          description="Estem treballant constantment per portar noves eines que potenciïn el teu negoci. Aquestes són algunes de les properes funcions."
        />
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="h-full"
                >
                  <Card
                    onClick={() => setSelectedFeature(feature)}
                    className="flex flex-col h-full cursor-pointer overflow-hidden"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {feature.status}
                        </Badge>
                      </div>
                      {/* ✅ MIDA: Títol de la targeta més gran */}
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {/* ✅ MIDA: Descripció de la targeta una mica més gran */}
                      <CardDescription className="text-sm">
                        {feature.shortDescription}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- DIÀLEG DETALLAT --- */}
      <Dialog
        open={!!selectedFeature}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedFeature(null);
        }}
      >
        {/* ✅ MIDA: Diàleg més ample per a presentació */}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full flex-shrink-0 mt-1">
                    <selectedFeature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    {/* ✅ MIDA: Títol del diàleg molt més gran */}
                    <DialogTitle className="text-3xl font-bold">
                      {selectedFeature.title}
                    </DialogTitle>
                    {/* ✅ MIDA: Descripció del diàleg més gran */}
                    <DialogDescription className="text-lg text-muted-foreground pt-1">
                      {selectedFeature.shortDescription}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                
                {/* Secció "Què farà?" */}
                <div>
                  {/* ✅ MIDA: Títol de secció més gran */}
                  <h3 className="font-semibold text-2xl mb-5">Com funcionarà?</h3>
                  <div className="space-y-4">
                    {selectedFeature.details.what.map((item, index) => {
                      const StepIcon = item.icon;
                      return (
                        <div key={index} className="flex items-start gap-4">
                          <StepIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                          {/* ✅ MIDA: Text del pas més gran */}
                          <p className="text-base text-foreground/90">{item.step}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secció "Per què importa?" */}
                <div>
                  {/* ✅ MIDA: Títol de secció més gran */}
                  <h3 className="font-semibold text-2xl mb-5">El Teu Benefici</h3>
                  <div className="space-y-4">
                    {selectedFeature.details.why.map((item, index) => {
                      const BenefitIcon = item.icon;
                      return (
                        <div key={index} className="flex items-start gap-4">
                          <BenefitIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                          {/* ✅ MIDA: Text del benefici més gran */}
                          <p className="text-base text-foreground/90">{item.benefit}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}