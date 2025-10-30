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

// --- Helper Hook: useWindowSize ---
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

/**
 * @summary Sub-component per a cada "Moneda" flotant
 */
function FloatingCoin({ Icon, colorHsl }: { 
  Icon: React.ElementType;
  colorHsl: string;
}) {
  const { width, height } = useWindowSize();

  const randomValues = useMemo(() => {
    // Si la finestra encara no té mida, no calculem res.
    if (width === 0 || height === 0) {
      return null;
    }

    const size = Math.random() * (74 - 50) + 50; // Mida aleatòria (50px a 74px)

    // ✅ MILLORA 3: Definim la "zona morta" central
    const deadZone = {
      x: [width * 0.3, width * 0.7], // Evitem entre el 30% i 70% de l'amplada
      y: [height * 0.3, height * 0.6], // Evitem entre el 30% i 60% de l'alçada
    };

    // Funció per generar una posició (x, y) FORA de la zona morta
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

    // Generem posició inicial i final FORA de la zona morta
    const { x: xInitial, y: yInitial } = getSafeRandomPosition();
    const { x: xAnimate, y: yAnimate } = getSafeRandomPosition();

    // Temps d'animació de "flotació" (lent)
    const floatDuration = Math.random() * 20 + 25; // 25s a 45s (més lent)

    // ✅ MILLORA 2: Temps d'animació de "rotació" (més lent)
    const rotateDuration = Math.random() * 10 + 10; // 10s a 20s
    const rotateDelay = Math.random() * 5;

    return { 
      size, xInitial, yInitial, xAnimate, yAnimate, 
      floatDuration, rotateDuration, rotateDelay 
    };
  }, [width, height]); // Recalculem si la finestra canvia de mida

  // No renderitzem res si encara no tenim els valors
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
        // ✅ MILLORA: Ombra de color més subtil (0.25 opacitat)
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
        // ✅ MILLORA 1: Opacitat constant (més subtil)
        opacity: 0.3,
        rotateY: 360,
      }}
      
      transition={{
        // Transició per a la FLOTACIÓ (x, y)
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
        
        // Transició per a la ROTACIÓ (rotateY)
        rotateY: { 
          duration: randomValues.rotateDuration, 
          delay: randomValues.rotateDelay, 
          repeat: Infinity, 
          ease: 'linear'
        },
        
        // ✅ MILLORA 1: Transició per a 'opacity' (només fade-in)
        // Aquesta animació NO es repeteix.
        opacity: {
          duration: 3, // 3 segons per aparèixer
   
          ease: 'easeIn'
        }
      }}
    >
      <Icon 
        className="w-1/2 h-1/2" 
        style={{ color: color, opacity: 0.9 }} // Icona una mica transparent
      />
    </motion.div>
  );
}

/**
 * @summary Fons de la secció Hero amb icones flotants aleatòries.
 */
export function IconCloudBackground() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Apliquem 'perspective' per a l'efecte 3D de la rotació */}
      <div style={{ perspective: '800px' }}>
        {allIcons.map((Icon, i) => (
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
    
      