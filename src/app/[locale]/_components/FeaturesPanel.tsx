"use client";

import { Briefcase, Landmark, Headphones, Users, Workflow, ArrowRight} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { ElementType } from 'react'; // ✅ Importem ElementType des de React

// Sub-component per a cada element del panell
const FeatureItem = ({ icon: Icon, title, description, href, colorClass }: { 
  icon: ElementType, 
  title: string, 
  description: string, 
  href: string,
  colorClass: string
}) => (
  <motion.a 
    href={href}
    whileHover={{ scale: 1.02 }} // Una animació més subtil
    className="flex items-center gap-5 group p-4 hover:bg-muted/50 rounded-lg transition-colors"
  >
    {/* ✅ MILLORA: Fons més sòlid per a la icona que s'adapta al tema */ }
    <div className="p-3 bg-background/50 dark:bg-muted rounded-lg mt-1 group-hover:bg-primary/10 transition-colors ring-1 ring-border">
      {/* ✅ MILLORA: Icona més gran */}
      <Icon className={`w-6 h-6 transition-colors ${colorClass}`} />
    </div>
    <div className="flex-1">
      {/* ✅ MILLORA: Text més gran */}
      <h3 className="font-bold text-lg group-hover:text-foreground transition-colors">{title}</h3>
      <p className="text-base text-muted-foreground">{description}</p>
    </div>
    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.a>
);

/**
 * @summary Component que renderitza el panell lateral amb les funcionalitats destacades.
 */
export function FeaturesPanel() {
  const t = useTranslations('MainLandingView.featuresPanel');
  
  const features = [
    { icon: Briefcase, title: t('crm.title'), description: t('crm.desc'), href: "#crm", colorClass: 'text-brand-green' },
    { icon: Landmark, title: t('finances.title'), description: t('finances.desc'), href: "#finances", colorClass: 'text-brand-cyan' },
    { icon: Headphones, title: t('comunicacio.title'), description: t('comunicacio.desc'), href: "#comunicacio", colorClass: 'text-brand-pink' },
    { icon: Users, title: t('network.title'), description: t('network.desc'), href: "#network", colorClass: 'text-brand-green' },
    { icon: Workflow, title: t('projectStrocture.title'), description: t('projectStrocture.desc'), href: "#projectes", colorClass: 'text-brand-cyan' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      className="glass-card p-6 rounded-2xl space-y-2"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-4 mb-2">{t('title')}</h2>
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
        >
          <FeatureItem {...feature} />
        </motion.div>
      ))}
    </motion.div>
  );
}