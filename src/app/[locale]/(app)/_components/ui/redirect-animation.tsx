// src/app/_components/ui/redirect-animation.tsx
"use client"; // ✅ Indica a Next.js que aquest component s'executa al client (necessari per animacions i estat).

import { motion } from 'framer-motion'; // ✅ Importem Framer Motion per gestionar animacions.
import { Rocket } from 'lucide-react'; // ✅ Icona de coet de la llibreria Lucide.

export default function RedirectAnimation() {
  // ✅ Component que mostra una animació mentre es prepara l'espai de treball.
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      {/* ✅ Animació principal del coet */}
      <motion.div
        // Estat inicial del coet: posició vertical y=0, opacitat completa i lleuger gir.
        initial={{ y: 0, opacity: 1, rotate: -45 }}
        // Animació: el coet es mou cap amunt i desapareix (opacitat 0).
        animate={{ y: -150, opacity: 0 }}
        // Configuració de la transició: durada, suavitzat, repetició infinita amb retard.
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
          repeatDelay: 1,
        }}
      >
        {/* ✅ Icona del coet estilitzada */}
        <Rocket className="w-24 h-24 text-primary" />
      </motion.div>

      {/* ✅ Text que apareix suaument després d’un retard */}
      <motion.p
        initial={{ opacity: 0 }} // El text comença invisible.
        animate={{ opacity: 1 }} // Es fa visible.
        transition={{ delay: 0.5, duration: 1 }} // Apareix després de 0.5s, dura 1s.
        className="text-2xl font-semibold text-muted-foreground"
      >
        Preparant el teu espai de treball...
      </motion.p>
    </div>
  );
}
