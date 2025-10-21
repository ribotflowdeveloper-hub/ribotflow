"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { navModules, bottomItems } from '@/config/navigation';
import type { NavItem } from '@/types/app/navigation';

export function MobileMenu({ onOpenSignOutDialog, onNotImplementedClick, handleNavigation }: {
    onOpenSignOutDialog: () => void;
    onNotImplementedClick: (e: React.MouseEvent) => void;
    handleNavigation: (item: NavItem) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('Navigation');

    const createClickHandler = (item: NavItem) => () => {
        handleNavigation(item);
        if (item.isSingle !== false) {
            setIsOpen(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[320px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b"><SheetTitle>{t('menuTitle')}</SheetTitle></SheetHeader>
                
                {/* Aquesta part es queda igual */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navModules.map(module => (
                        module.isSingle ? (
                            <Button key={module.id} variant="ghost" className="w-full justify-start gap-3 px-4 py-3 text-base font-medium" onClick={createClickHandler(module)}>
                                <module.icon className="w-5 h-5" /> {t(module.labelKey)}
                            </Button>
                        ) : (
                            <Accordion key={module.id} type="single" collapsible className="w-full">
                                <AccordionItem value={module.id} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-base font-medium hover:no-underline hover:bg-muted rounded-lg">
                                        <div className="flex items-center gap-3"><module.icon className="w-5 h-5" />{t(module.labelKey)}</div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-8 pt-2 pb-1">
                                        <div className="flex flex-col gap-1">
                                            {module.children?.map((item: NavItem) => (
                                                <Button key={item.id} variant="ghost" className="w-full justify-start gap-3 px-4 py-2 text-muted-foreground hover:text-foreground" onClick={createClickHandler(item)}>
                                                    <item.icon className="w-4 h-4" />{t(item.labelKey)}
                                                </Button>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )
                    ))}
                </nav>

                {/* ✅ CORRECCIÓ: Apliquem la mateixa lògica d'acordió als 'bottomItems' */}
                <div className="p-4 border-t mt-auto space-y-1">
                    {bottomItems.map(item => (
                        item.isSingle ? (
                            // Gestiona 'AI' i altres enllaços simples
                            <Button
                                key={item.id}
                                variant="ghost"
                                className="w-full justify-start gap-3 px-4 py-3 text-base font-medium"
                                onClick={item.notImplemented ? onNotImplementedClick : createClickHandler(item)}
                            >
                                <item.icon className="w-5 h-5" /> {t(item.labelKey)}
                            </Button>
                        ) : (
                            // Gestiona 'Settings', que ara té fills
                            <Accordion key={item.id} type="single" collapsible className="w-full">
                                <AccordionItem value={item.id} className="border-b-0">
                                    <AccordionTrigger className="px-4 py-3 text-base font-medium hover:no-underline hover:bg-muted rounded-lg">
                                        <div className="flex items-center gap-3"><item.icon className="w-5 h-5" />{t(item.labelKey)}</div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-8 pt-2 pb-1">
                                        <div className="flex flex-col gap-1">
                                            {item.children?.map((child: NavItem) => (
                                                <Button key={child.id} variant="ghost" className="w-full justify-start gap-3 px-4 py-2 text-muted-foreground hover:text-foreground" onClick={createClickHandler(child)}>
                                                    <child.icon className="w-4 h-4" />{t(child.labelKey)}
                                                </Button>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )
                    ))}
                    <Button variant="ghost" className="w-full justify-start gap-3 px-4 py-3 text-base font-medium text-red-500 hover:text-red-600" onClick={onOpenSignOutDialog}>
                        <LogOut className="w-5 h-5" /> {t('signOut')}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}