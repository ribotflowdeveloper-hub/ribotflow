"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  Landmark,
  Headphones,
  Mail,
  Contact,
  FileText,
  Receipt,
  Bot,
  Settings,
  Users,
  Workflow,
  CalendarDays,
  KeyRound,
  Download,
  ShieldOff,
  Wrench,
  Puzzle,
  CreditCard,
  User,
} from 'lucide-react';

// --- Helper Hook: useWindowSize (Sense canvis) ---
function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  return windowSize;
}

// 1. Totes les icones que volem utilitzar
const allIcons = [
  LayoutDashboard, Briefcase, Landmark, Headphones, Mail, Contact, FileText,
  Receipt, Bot, Settings, Users, Workflow, CalendarDays, KeyRound, Download,
  ShieldOff, Wrench, Puzzle, CreditCard, User,
];

// 2. Paleta de colors HSL
const colorPalette = [
  '220 80% 60%', // Blau
  '140 70% 50%', // Verd
  '40 90% 60%',  // Groc
  '330 80% 60%', // Rosa
  '260 80% 65%', // Morat
  '190 90% 50%', // Cyan
  '25 90% 55%',  // Taronja
];

// 3. ✨ NOU: Definim quants icones volem per a mòbil i escriptori
const MOBILE_ICON_COUNT = 8; // <-- Pots ajustar aquest número
const DESKTOP_ICON_COUNT = allIcons.length; // 20

/**
 * @summary Sub-component per a cada "Moneda" flotant (Sense canvis)
 */
function FloatingCoin({ Icon, colorHsl }: { 
  Icon: React.ElementType;
  colorHsl: string;
}) {
  const { width, height } = useWindowSize();

  const randomValues = useMemo(() => {
    if (width === 0 || height === 0) {
      return null;
    }

    const size = Math.random() * (74 - 50) + 50; 
    const deadZone = {
      x: [width * 0.3, width * 0.7], 
      y: [height * 0.3, height * 0.6],
    };

    const getSafeRandomPosition = () => {
      let x, y;
      do {
        x = Math.random() * (width - size);
      } while (x > deadZone.x[0] && x < deadZone.x[1]);
      
      do {
        y = Math.random() * (height - size);
      } while (y > deadZone.y[0] && y < deadZone.y[1]);
      
      return { x, y };
    };

    const { x: xInitial, y: yInitial } = getSafeRandomPosition();
    const { x: xAnimate, y: yAnimate } = getSafeRandomPosition();

    const floatDuration = Math.random() * 20 + 25; 
    const rotateDuration = Math.random() * 10 + 10;

    return { 
      size, xInitial, yInitial, xAnimate, yAnimate, 
      floatDuration, rotateDuration
    };
  }, [width, height]); 

  if (!randomValues) return null;

  const color = `hsl(${colorHsl})`;

  return (
    <motion.div
      className="absolute flex items-center justify-center
                bg-background/60 backdrop-blur-sm"
      
      style={{
        width: randomValues.size,
        height: randomValues.size,
        borderRadius: '50%',
        boxShadow: `0 0 20px 5px hsla(${colorHsl})`,
        border: `1px solid hsla(${colorHsl}, 0.4)`,
        backfaceVisibility: 'hidden',
      }}
      
      initial={{
        x: randomValues.xInitial,
        y: randomValues.yInitial,
        opacity: 0,
        rotateY: 0,
      }}
      
      animate={{
        x: randomValues.xAnimate,
        y: randomValues.yAnimate,
        opacity: 0.3,
        rotateY: 360,
      }}
      
      transition={{
        x: { 
          duration: randomValues.floatDuration, 
          repeat: Infinity, 
          repeatType: 'mirror', 
          ease: 'easeInOut' 
        },
        y: { 
          duration: randomValues.floatDuration, 
          repeat: Infinity, 
          repeatType: 'mirror', 
          ease: 'easeInOut' 
        },
        rotateY: { 
          duration: randomValues.rotateDuration, 
          repeat: Infinity, 
          ease: 'linear'
        },
        opacity: {
          duration: 3,
          ease: 'easeIn'
        }
      }}
    >
      <Icon 
        className="w-1/2 h-1/2" 
        style={{ color: color, opacity: 0.9 }}
      />
    </motion.div>
  );
}

/**
 * @summary Fons de la secció Hero amb icones flotants aleatòries.
 * @description ✅ AFEGIDA LÒGICA RESPONSIVA
 * Ara comprova la mida de la finestra per renderitzar 
 * menys icones en dispositius mòbils.
 */
export function IconCloudBackground() {
  
  // ✅ ARQUITECTURA: Cridem el hook useWindowSize al component pare.
  const { width } = useWindowSize();

  // ✅ RENDIMENT:
  // Utilitzem useMemo per decidir quantes icones renderitzar.
  // Això s'actualitzarà només quan 'width' canviï (o creuï el breakpoint).
  const iconsToRender = useMemo(() => {
    // Si 'width' és 0 (estat inicial abans del 'mount' al client),
    // no renderitzem res per evitar problemes d'hidratació (hydration mismatch).
    if (width === 0) {
      return [];
    }

    // Definim el punt de tall (breakpoint). 768px és 'md' a Tailwind.
    const isMobile = width < 768;
    
    // Triem el nombre d'icones
    const count = isMobile ? MOBILE_ICON_COUNT : DESKTOP_ICON_COUNT;

    // Retornem un 'slice' de l'array original.
    // Això ens dóna les primeres 8 icones si és mòbil, o totes 20 si és escriptori.
    return allIcons.slice(0, count);

  }, [width]); // Aquesta lògica es re-executa NOMÉS quan 'width' canvia.

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Apliquem 'perspective' per a l'efecte 3D de la rotació */}
      <div style={{ perspective: '800px' }}>
        
        {/* ✅ CANVI: Mapegem sobre 'iconsToRender' (dinàmic) 
            en lloc de 'allIcons' (estàtic) */}
        {iconsToRender.map((Icon, i) => (
          <FloatingCoin 
            key={i} 
            Icon={Icon} 
            colorHsl={colorPalette[i % colorPalette.length]}
          />
        ))}
      </div>
    </div>
  );
}