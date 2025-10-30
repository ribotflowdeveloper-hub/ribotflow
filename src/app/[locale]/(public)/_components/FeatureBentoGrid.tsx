"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// 👇 1. Importem les icones
import {
  Briefcase,
  Calendar,
  LayoutDashboard,
  BarChart,
  Share2,
  Repeat,
  Network,
  Inbox
} from 'lucide-react';

// ✨ NOU: Importem la BentoCard refactoritzada
import { BentoCard } from './BentoCard';
import type { BentoFeature } from './BentoCard'; // ✨ NOU: Importem el tipus
const classBentoFeatures = 'lg:col-span-1';
// Informació de les targetes
const bentoFeatures: BentoFeature[] = [
  {
    id: 'dashboard',
    titleKey: 'dashboard.title',
    descKey: 'dashboard.desc',
    imageSrc: '/dashboard3.png',
    icon: LayoutDashboard,
    className: classBentoFeatures, // Es fa servir per a l'alçada
  },
  {
    id: 'crm',
    titleKey: 'crm.title',
    descKey: 'crm.desc',
    imageSrc: '/crm2.png',
    icon: Briefcase,
    className: classBentoFeatures,
  },
  {
    id: 'calendari',
    titleKey: 'calendari.title',
    descKey: 'calendari.desc',
    imageSrc: '/calendari2.png',
    icon: Calendar,
    className: classBentoFeatures,
  },
  {
    id: 'pipeline',
    titleKey: 'pipeline.title',
    descKey: 'pipeline.desc',
    imageSrc: '/pipeline1.png',
    icon: BarChart,
    className: classBentoFeatures,
  },
  {
    id: 'social',
    titleKey: 'social.title',
    descKey: 'social.desc',
    imageSrc: '/rrss.png',
    icon: Share2,
    className: classBentoFeatures,
  },
  {
    id: 'invoicing',
    titleKey: 'invoicing.title',
    descKey: 'invoicing.desc',
    imageSrc: '/fluxPresupostos.png',
    icon: Repeat,
    className: classBentoFeatures,
  },
  {
    id: 'network',
    titleKey: 'network.title',
    descKey: 'network.desc',
    imageSrc: '/network2.jpg',
    icon: Network,
    className: classBentoFeatures,
  },
    {
    id: 'inboxDespesa',
    titleKey: 'inboxDespesa.title',
    descKey: 'inboxDespesa.desc',
    imageSrc: '/inboxDespesa.png',
    icon: Inbox,
    className: classBentoFeatures,
  },
];

// Variants per a l'animació escalonada de les columnes
const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Les columnes apareixen amb un lleuger retard
      ease: 'easeOut',
    },
  },
};

// Variants per a les targetes dins de cada columna
const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};


/**
 * @summary El grid "Bento" que mostra les funcionalitats principals.
 * @description ARQUITECTURA: Versió 3D "passadís" que anima
 * targetes individuals al centre en fer click.
 */
export function FeatureBentoGrid() {
  const t = useTranslations('MainLandingView.showcase');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const leftFeatures = bentoFeatures.slice(0, 4);
  const rightFeatures = bentoFeatures.slice(4);

  const selectedFeature = bentoFeatures.find((f) => f.id === selectedId);

  return (
    <>
      <motion.div
  className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-8 md:px-12 lg:px-16 [perspective:1200px]"
  variants={gridVariants}
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.1 }}
>

        {/* === Columna Esquerra === */}
        <motion.div
          className="flex flex-col gap-8 [transform-style:preserve-3d] lg:[transform:rotateY(10deg)_translateX(-5%)]"
          variants={gridVariants}
        >
          {leftFeatures.map((feature) => (
            <BentoCard
              key={feature.id}
              feature={feature}
              layoutId={feature.id}
              onClick={() => setSelectedId(feature.id)}
              isOpen={false}
              t={t}
              variants={cardVariants}
            />
          ))}
        </motion.div>

        {/* === Columna Dreta === */}
        <motion.div
          className="flex flex-col gap-8 [transform-style:preserve-3d] lg:[transform:rotateY(-10deg)_translateX(5%)]"
          variants={gridVariants}
        >
          {rightFeatures.map((feature) => (
            <BentoCard
              key={feature.id}
              feature={feature}
              layoutId={feature.id}
              onClick={() => setSelectedId(feature.id)}
              isOpen={false}
              t={t}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* === Modal per a la targeta seleccionada (Animació individual) === */}
      <AnimatePresence>
        {selectedId && selectedFeature && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedId(null)}
          >
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-background/90 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />

            {/* Contenidor de la targeta (evita que el click es propagui) */}
            <motion.div
              className="relative z-10 w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              {/* La BentoCard s'anima gràcies a layoutId */}
              <BentoCard
                feature={selectedFeature}
                layoutId={selectedId}
                onClick={() => setSelectedId(null)} // Clicar la card també la tanca
                isOpen={true} // <-- Prop clau
                t={t}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}