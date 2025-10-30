"use client";

import { LandingNav } from './_components/LandingNav';
import { HeroContent } from './_components/HeroContent';
// ✅ NOU: Importem el fons de partícules
import { ParticleBackground } from './_components/ParticleBackground';
// ✅ NOU: Importem el nou Bento Grid
import { FeatureBentoGrid } from './_components/FeatureBentoGrid';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { IconCloudBackground } from './_components/IconCloudBackground';

export function MainLandingView() {
  const t = useTranslations('MainLandingView.bentoGrid');

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden relative">
      <LandingNav />

      {/* --- Secció 1: HERO --- */}
      <main className="relative z-10">
        {/* ✅ CANVI: Substituïm el component de partícules pel nou d'icones */}
        <div className="absolute inset-0 -z-10 h-screen">
          <IconCloudBackground />
          <ParticleBackground />
        </div>

        {/* ✅ CORRECCIÓ MÒBIL:
            - Canviat 'h-[80vh] md:h-screen' per 'min-h-[80vh] md:min-h-screen' 
              per asegurar que el contingut hi cap si és més alt.
            - Afegit 'pt-20' (80px) per deixar espai a la LandingNav (que és 'fixed').
            - Afegit 'pb-10' per a un millor espaiat inferior en mòbil.
        */}
        <section
          className="container mx-auto px-4 
                     min-h-[80vh] md:min-h-screen 
                     flex items-center justify-center 
                     pt-20 pb-10" // <-- CANVI CLAU AQUÍ
        >
          <HeroContent />
        </section>

        {/* --- Secció 2: BENTO GRID (Casos d'Ús) --- */}
        <section className="container mx-auto px-4 pb-20 md:pb-40">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-3xl md:text-5xl font-black tracking-tighter text-center mb-16"
          >
            {t('title')}
          </motion.h2>

          <FeatureBentoGrid />
        </section>

      </main>
    </div>
  );
}