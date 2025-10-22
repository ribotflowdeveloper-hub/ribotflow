"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Importem els nous components de la UI
import { ThemeSwitcher } from '@/app/[locale]/(app)/settings/customization/_components/ThemeSwitcher';
import { LanguageSwitcher } from '@/app/[locale]/(app)/settings/customization/_components/LanguageSwitcher';
import { Button } from '@/components/ui/button';

// Carreguem el fons de partícules de manera dinàmica per a un millor rendiment.
const ParticleBackground = dynamic(
  () => import('./ParticleBackground').then(mod => mod.ParticleBackground),
  { ssr: false }
);

// Sub-components interns per a una millor organització del codi.
const CountdownBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="min-w-[80px] md:min-w-[120px] text-center">
    <span className="text-[clamp(3rem,8vw,5rem)] font-bold leading-none block">{value}</span>
    <span className="text-xs md:text-sm font-light text-gray-400 tracking-widest uppercase">{label}</span>
  </div>
);
const FeatureBlock = ({ title, color, dataTitle, children }: { title: string; color: string; dataTitle: string; children: React.ReactNode }) => (
  <div className="feature-block py-16 mb-32 opacity-20 transition-opacity duration-500" data-title={dataTitle}>
    <h3 className={`text-3xl font-medium mb-4 ${color}`}>{title}</h3>
    {/* ✅ CORRECCIÓ: Canviem 'text-gray-300' per 'text-muted-foreground' */}
    <p className="text-xl leading-relaxed text-muted-foreground max-w-prose">
      {children}
    </p>
  </div>
);

/**
 * @summary El component principal i interactiu de la Landing Page.
 */
export function CountdownView() {
  const t = useTranslations('LandingPage');
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [isClient, setIsClient] = useState(false);
  const featureContentRef = useRef<HTMLDivElement>(null);
  const stickyTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setIsClient(true); }, []);

  // Lògica del compte enrere (sense canvis).
  useEffect(() => {
    if (!isClient) return;
    const countDownDate = new Date("Oct 1, 2025 00:00:00").getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = countDownDate - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ days: '00', hours: '00', minutes: '00', seconds: '00' });
        return;
      }
      setTimeLeft({
        days: String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0'),
        hours: String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'),
        minutes: String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'),
        seconds: String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0'),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isClient]);

  // ✅ CORRECCIÓ: Efecte per a l'animació de l'scroll.
  useEffect(() => {
    if (!isClient || !featureContentRef.current || !stickyTitleRef.current) return;

    const featureBlocks = Array.from(featureContentRef.current.querySelectorAll<HTMLDivElement>('.feature-block'));
    const stickyTitle = stickyTitleRef.current;

    const updateActiveFeature = (target: Element) => {
      const title = target.getAttribute('data-title');
      if (title) stickyTitle.innerHTML = title;
      featureBlocks.forEach(b => b.classList.remove('opacity-100'));
      target.classList.add('opacity-100');
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          updateActiveFeature(entry.target);
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

    featureBlocks.forEach(block => observer.observe(block));

    // Activem el primer bloc manualment a la càrrega inicial per solucionar l'error.
    if (featureBlocks.length > 0) {
      updateActiveFeature(featureBlocks[0]);
    }

    return () => featureBlocks.forEach(block => observer.unobserve(block));
  }, [isClient]);

  return (
    <div className="relative z-10 bg-background text-foreground">
      {/* El fons de partícules es renderitza només al client i per sota de tot. */}
      {isClient && <ParticleBackground />}

      <div className="relative z-10">
        {/* ✅ NOU: Barra de navegació superior amb nou disseny */}

        <nav className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-background/50 backdrop-blur-md border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/android-chrome-192x192.png" alt="Logo de Ribotflow" width={32} height={32} />
            <span className="font-bold text-lg hidden sm:block">Ribotflow</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Button asChild className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold hover:opacity-90 transition-opacity">
              <Link href="/login">Accedir</Link>
            </Button>
          </div>
        </nav>

        <header className="flex flex-col justify-center items-center h-screen text-center p-4">
          <h1 className="text-[clamp(3.5rem,10vw,7rem)] font-black tracking-tighter leading-none mb-6 bg-gradient-to-r from-green-400 via-cyan-400 to-pink-500 bg-clip-text text-transparent animate-gradient-shift">
            {t('mainTitle')}
          </h1>
          <p className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-light text-muted-foreground max-w-3xl leading-relaxed mb-14">
            {t('subtitle')}
          </p>
          <div className="flex gap-4 md:gap-8">
            <CountdownBlock value={timeLeft.days} label={t('days')} />
            <CountdownBlock value={timeLeft.hours} label={t('hours')} />
            <CountdownBlock value={timeLeft.minutes} label={t('minutes')} />
            <CountdownBlock value={timeLeft.seconds} label={t('seconds')} />
          </div>
        </header>

        {/* Títol d'introducció a les funcionalitats */}
        <h2 className="text-[clamp(2rem,4vw,3rem)] text-center my-32 font-extrabold bg-gradient-to-r from-green-400 via-cyan-400 to-pink-500 bg-clip-text text-transparent animate-gradient-slow">
          {t('featuresIntro')}
        </h2>

        {/* Secció de les funcionalitats amb efecte d'scroll */}
        <section className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-8 max-w-6xl mx-auto px-8">
          <div className="sticky top-0 h-screen hidden md:flex items-center">
            <h2 ref={stickyTitleRef} className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight transition-opacity duration-500"></h2>
          </div>
          <div ref={featureContentRef}>
            <FeatureBlock title={t('feature1Title')} color="text-green-400" dataTitle={t('feature1DataTitle')}>{t('feature1Text')}</FeatureBlock>
            <FeatureBlock title={t('feature2Title')} color="text-cyan-400" dataTitle={t('feature2DataTitle')}>{t('feature2Text')}</FeatureBlock>
            <FeatureBlock title={t('feature3Title')} color="text-pink-400" dataTitle={t('feature3DataTitle')}>{t('feature3Text')}</FeatureBlock>
            <FeatureBlock title={t('feature4Title')} color="text-green-400" dataTitle={t('feature4DataTitle')}>{t('feature4Text')}</FeatureBlock>
            <FeatureBlock title={t('feature5Title')} color="text-cyan-400" dataTitle={t('feature5DataTitle')}>{t('feature5Text')}</FeatureBlock>
            <FeatureBlock title={t('feature6Title')} color="text-pink-400" dataTitle={t('feature6DataTitle')}>{t('feature6Text')}</FeatureBlock>
          </div>
        </section>

        {/* Peu de pàgina */}
        <footer className="text-center py-16 text-gray-500">
          {/* ✅ NOU: Afegim el selector de tema al peu de pàgina */}
          <div className="mb-8 flex justify-center">
            <ThemeSwitcher />
          </div>
          <p>&copy; {new Date().getFullYear()} Ribotflow. {t('developedBy')} <Link href="..." className="...">DigitAI Studios</Link>.</p>
        </footer>
      </div>
    </div>
  );
}