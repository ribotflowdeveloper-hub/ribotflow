/**
 * @file QuickAccess.tsx
 * @summary Renderitza la secció d'accés ràpid amb scroll horitzontal.
 */
"use client";

import React, { useRef, useState, useEffect, FC, ElementType } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Workflow, FileText, FolderOpen, Mail, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @summary Targeta petita per a un enllaç d'accés ràpid.
 */
const QuickTile: FC<{ href: string; icon: ElementType; label: string; desc: string; }> = ({ href, icon: Icon, label, desc }) => (
  <Link href={href} className="group flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/6">
    <div className="rounded-2xl px-4 py-5 bg-white/5 hover:bg-white/10 transition ring-1 ring-white/10 h-full">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-white/20 to-transparent p-2.5">
          <Icon className="w-5 h-5 text-white/90" />
        </div>
        <div>
          <div className="font-semibold">{label}</div>
          <div className="text-xs text-white/70">{desc}</div>
        </div>
      </div>
    </div>
  </Link>
);

export function QuickAccess() {
  const t = useTranslations('DashboardClient');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScrollability();
      el.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, []);
  
  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className='flex items-center gap-2'>
          <Sparkles className="w-5 h-5 text-pink-300" />
          <h2 className="text-xl font-bold text-white">{t('quickAccess')}</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleScroll('left')} disabled={!canScrollLeft} className="h-8 w-8 rounded-full disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleScroll('right')} disabled={!canScrollRight} className="h-8 w-8 rounded-full disabled:opacity-30"><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4 -mb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <QuickTile href="/crm/contactes" icon={Users} label={t('contacts')} desc={t('crm')} />
        <QuickTile href="/crm/pipeline" icon={Workflow} label={t('pipeline')} desc={t('opportunities')} />
        <QuickTile href="/finances/facturacio" icon={FileText} label={t('invoicing')} desc={t('invoices')} />
        <QuickTile href="/finances/despeses" icon={FolderOpen} label={t('expenses')} desc={t('costs')} />
        <QuickTile href="/comunicacio/inbox" icon={Mail} label={t('inbox')} desc={t('communication')} />
        <QuickTile href="/crm/quotes" icon={BookOpen} label={t('quotes')} desc={t('quotes')} />
      </div>
    </div>
  );
}