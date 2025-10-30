"use client";

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

// Les animacions escalonades són perfectes per a això
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
} as const;

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
} as const;


export function HeroContent() {
  const t = useTranslations('MainLandingView');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      // ✅ DISSENY: Tot centrat, amb un ample màxim per a llegibilitat
      className="flex flex-col items-center text-center max-w-3xl"
    >
      <motion.h1 
        variants={childVariants}
        // ✅ DISSENY: Títol més gran i impactant
        className="text-5xl md:text-7xl font-black tracking-tighter !leading-[1.1] mb-6"
      >
        {t('title')}
      </motion.h1>
      
      <motion.p 
        variants={childVariants}
        // ✅ DISSENY: Text més gran i amb més contrast
        className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-12"
      >
        {t('subtitle')}
      </motion.p>
      
      <motion.div variants={childVariants} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        {/* Aquest botó ja té el disseny net que vam definir (sense gradient) */}
        <Button 
          asChild 
          size="lg" 
          className="text-lg py-7 px-10 rounded-full font-bold
                     shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40
                     transition-all duration-300 ease-out"
        >
          <Link href="/signup">{t('ctaButton')}</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}