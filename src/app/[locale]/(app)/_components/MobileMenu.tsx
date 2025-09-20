"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { navModules, bottomItems } from '@/config/navigation';
import { useNavigationStore } from '@/stores/navigationStore';
import { usePathname } from 'next/navigation';

export function MobileMenu({ onOpenSignOutDialog, onNotImplementedClick }: {
    onOpenSignOutDialog: () => void;
    onNotImplementedClick: (e: React.MouseEvent) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('Navigation');
    const locale = useLocale();
    const fullPathname = usePathname();
    const { setIsNavigating } = useNavigationStore();

    const handleLinkClick = (path: string) => {
        if (fullPathname !== `/${locale}${path}`) {
            setIsNavigating(true);
        }
        setIsOpen(false);
    };

    // ❌ Eliminem la separació en 'singleItems' i 'nestedItems'

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[320px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>{t('menuTitle')}</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {/* ✅ CORRECCIÓ: Recorrem l'array original 'navModules' per mantenir l'ordre */}
                    {navModules.map(module => (
                        module.isSingle ? (
                            // Si és un enllaç simple, renderitzem un Link
                            <Link
                                key={module.id}
                                href={`/${locale}${module.path}`}
                                onClick={() => handleLinkClick(module.path)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-muted"
                            >
                                <module.icon className="w-5 h-5" />
                                {t(module.labelKey)}
                            </Link>
                        ) : (
                            // Si té fills, renderitzem un Acordió individual per a ell
                            <Accordion key={module.id} type="single" collapsible className="w-full">
                                <AccordionItem value={module.id} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-base font-medium hover:no-underline hover:bg-muted rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <module.icon className="w-5 h-5" />
                                            {t(module.labelKey)}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-8 pt-2 pb-1">
                                        <div className="flex flex-col gap-1">
                                            {module.children?.map(item => (
                                                <Link
                                                    key={item.id}
                                                    href={`/${locale}${item.path}`}
                                                    onClick={() => handleLinkClick(item.path)}
                                                    className="flex items-center gap-3 px-4 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    {t(item.labelKey)}
                                                </Link>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )
                    ))}
                </nav>
                {/* ✅ SECCIÓ INFERIOR AFEGIDA AL MENÚ MÒBIL */}
                <div className="p-4 border-t mt-auto space-y-1">
                    {bottomItems.map(item => 
                        item.notImplemented ? (
                            <Button key={item.id} variant="ghost" className="w-full justify-start gap-3 px-4 py-3" onClick={onNotImplementedClick}>
                                <item.icon className="w-5 h-5" /> {t(item.labelKey)}
                            </Button>
                        ) : (
                            <Link key={item.id} href={`/${locale}${item.path}`} onClick={() => handleLinkClick(item.path)} className="flex items-center gap-3 px-4 py-3 rounded-lg ...">
                                <item.icon className="w-5 h-5" /> {t(item.labelKey)}
                            </Link>
                        )
                    )}
                    <Button variant="ghost" className="w-full justify-start gap-3 px-4 py-3 text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={onOpenSignOutDialog}>
                        <LogOut className="w-5 h-5" /> {t('signOut')}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}