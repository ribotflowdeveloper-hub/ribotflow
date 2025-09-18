"use client";

import { LandingNav } from './LandingNav';
import { FeaturesPanel } from './FeaturesPanel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function MainLandingView() {
    const t = useTranslations('MainLandingView');

    return (
        <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
            <LandingNav />
            
            <main className="container mx-auto px-4 pt-40 pb-20">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    {/* Columna Esquerra: Text i CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter !leading-[1.1] mb-6">
                            {t('title')}
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10">
                            {t('subtitle')}
                        </p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button asChild size="lg" className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-lg py-7 px-10 hover:opacity-90 transition-opacity rounded-full">
                                <Link href="/signup">{t('ctaButton')}</Link>
                            </Button>
                        </motion.div>
                    </motion.div>
                    
                    {/* Columna Dreta: Panell de Funcions */}
                    <div className="hidden lg:block">
                        <FeaturesPanel />
                    </div>
                </div>
            </main>
        </div>
    );
}