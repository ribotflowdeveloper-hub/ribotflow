"use client";

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { navModules, bottomItems } from '@/config/navigation';
import type { NavItem } from '@/types/navigation';

export function MobileMenu({ onOpenSignOutDialog, onNotImplementedClick, handleNavigation }: {
    onOpenSignOutDialog: () => void;
    onNotImplementedClick: (e: React.MouseEvent) => void;
    handleNavigation: (item: NavItem) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations('Navigation');

    // Funció que crida a handleNavigation i tanca el menú
    const createClickHandler = (item: NavItem) => () => {
        handleNavigation(item);
        // Tanquem el menú si és un enllaç simple o si és un sub-ítem
        if (item.isSingle !== false) { // isSingle pot ser true o undefined
            setIsOpen(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:w-[320px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b"><SheetTitle>{t('menuTitle')}</SheetTitle></SheetHeader>
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
                                            {module.children?.map(item => (
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
                <div className="p-4 border-t mt-auto space-y-1">
                    {bottomItems.map(item => 
                        item.notImplemented ? (
                            <Button key={item.id} variant="ghost" className="w-full justify-start ..." onClick={onNotImplementedClick}>{/* ... */}</Button>
                        ) : (
                            <Button key={item.id} variant="ghost" className="w-full justify-start ..." onClick={createClickHandler(item)}>{/* ... */}</Button>
                        )
                    )}
                    <Button variant="ghost" className="w-full justify-start ... text-red-500" onClick={onOpenSignOutDialog}>
                        <LogOut className="w-5 h-5" /> {t('signOut')}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}