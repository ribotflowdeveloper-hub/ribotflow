// src/app/_components/ui/redirect-animation.tsx
"use client";

import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

export default function RedirectAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <motion.div
        // Animació: el coet puja i desapareix
        initial={{ y: 0, opacity: 1, rotate: -45 }}
        animate={{ y: -150, opacity: 0 }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 1,
        }}
      >
        <Rocket className="w-24 h-24 text-primary" />
      </motion.div>
      <motion.p
        // Animació: el text apareix suaument
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="text-2xl font-semibold text-muted-foreground"
      >
        Preparant el teu espai de treball...
      </motion.p>
    </div>
  );
}