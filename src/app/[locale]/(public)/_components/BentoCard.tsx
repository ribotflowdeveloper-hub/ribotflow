"use client";

import { motion, type Variants } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils/utils';
import type { LucideIcon } from 'lucide-react';

// Definim i exportem el tipus per reutilitzar-lo
export type BentoFeature = {
  id: string;
  titleKey: string;
  descKey: string;
  imageSrc: string;
  icon: LucideIcon;
  className: string;
};

type BentoCardProps = {
  feature: BentoFeature;
  layoutId: string;
  onClick: () => void;
  isOpen: boolean;
  t: (key: string) => string; // Funció de traducció
  variants?: Variants; // Per l'animació d'entrada
};

/**
 * @summary Component visual per a una targeta del Bento Grid.
 * @description ARQUITECTURA: Imatge com a fons de targeta (`object-cover`)
 * amb contingut superposat i gradient per a llegibilitat.
 */
export function BentoCard({
  feature,
  layoutId,
  onClick,
  isOpen,
  t,
  variants,
}: BentoCardProps) {
  const { icon: Icon, titleKey, descKey, imageSrc, className } = feature;
  const title = t(titleKey);
  const description = t(descKey);

  // Lògica d'alçada basada en el className original
  const isLargeCard = className?.includes('col-span-2');

  return (
    <motion.div
      layoutId={layoutId} // ✨ CLAU: El 'magic link' per l'animació
      onClick={onClick}
      variants={variants}
      className={cn(
        'relative group rounded-2xl overflow-hidden shadow-lg',
        // Estils de cursor
        !isOpen && 'cursor-pointer',
        isOpen && 'cursor-default',

        // ✅ CANVI: Fons per al 'letterboxing' quan la imatge està oberta
        // i en mode 'object-contain'. Fem servir 'bg-background'
        // que s'adapta al tema (clar/fosc).
        isOpen && 'bg-background',

        // ✅ ARQUITECTURA: Alçada dinàmica
        isOpen
          ? 'h-[75vh] w-full' // Alçada màxima quan està oberta
          : isLargeCard
            ? 'h-80 md:h-96' // Alçada de targeta "gran" al grid
            : 'h-64 md:h-72' // Alçada de targeta "petita" al grid
      )}
    >
      {/* 1. Imatge */}
      <Image
        src={imageSrc}
        alt={title}
        fill
        className={cn(
          'object-center transition-all duration-500 ease-out',
          
          // ✅ CANVI: 'contain' si obert (no es talla), 'cover' si tancat (omple)
          isOpen ? 'object-contain' : 'object-cover',
          
          !isOpen && 'group-hover:scale-105' // Zoom on hover només al grid
        )}
        // ✅ RENDIMENT: Optimització d'imatges
        quality={isOpen ? 90 : 75}
        priority={isOpen}
        placeholder="blur"
        blurDataURL={imageSrc}
        sizes={
          isOpen
            ? '90vw' // Quan està oberta, ocupa gairebé tota la vista
            : '(max-width: 1024px) 100vw, 50vw' // Quan està al grid, ocupa la meitat (2 cols)
        }
      />

      {/* 2. Overlay/Scrim per llegibilitat */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t to-transparent',
          
          // ✅ CANVI: Gradient molt més suau per no enfosquir la imatge
          isOpen
            ? 'from-black/60 via-black/10' // Subtil quan obert
            : 'from-black/60 via-black/30' // Una mica més fosc tancat
        )}
      />

      {/* 3. Contingut (a sobre de tot) */}
      <div className="relative z-10 flex flex-col justify-end h-full p-4 md:p-6 text-white">
        {/* Capçalera (Icona + Títol) */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className={cn(
              'p-2 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm',
              isOpen && 'p-3' // Icona més gran si obert
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 text-white',
                isOpen && 'w-6 h-6' // Icona més gran si obert
              )}
            />
          </div>
          <h3
            className={cn(
              'text-xl font-bold',
              isOpen && 'text-3xl' // Títol més gran si obert
            )}
          >
            {title}
          </h3>
        </div>

        {/* Descripció (pot ser més llarga si està obert) */}
        <p
          className={cn(
            'text-white/100',
            isOpen
              ? 'text-base md:text-lg max-w-3xl' // Més text i més gran
              : 'text-sx line-clamp-2' // Curt i petit al grid
          )}
        >
          {description}
        </p>
      </div>
    </motion.div>
  );
}