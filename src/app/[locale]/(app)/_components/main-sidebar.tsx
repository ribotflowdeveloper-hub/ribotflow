"use client"; // ✅ També component client, necessari per a hooks i navegació dinàmica.

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Correcte, utilitzem el de Next.js
import { useLocale, useTranslations } from 'next-intl';import { toast } from "sonner"; // ✅ Sistema de notificacions 'toast'.
import { createClient } from '@/lib/supabase/client'; // ✅ Client Supabase per gestió d'autenticació.
import { Sparkles, LogOut } from 'lucide-react';
import { navModules, bottomItems } from '@/config/navigation'; // ✅ Configuració de mòduls i elements de navegació.
import { cn, getCleanPathname } from '@/lib/utils'; // ✅ Importem la nova funció
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // ✅ Components per mostrar el diàleg de confirmació.
import type { NavItem } from '@/types/navigation';
import logo from '@/../public/icon1.png';
import Image from 'next/image';


// ✅ Barra lateral principal de navegació
export function MainSidebar({ onModuleSelect }: { onModuleSelect: (module: NavItem) => void }) {
    const fullPathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
    const supabase = createClient();
    const cleanPathname = getCleanPathname(fullPathname, locale);

    // ✅ Funció per tancar sessió
    const handleSignOut = async () => {
        await supabase.auth.signOut(); // Tanca sessió a Supabase.
        window.location.href = '/login'; // Redirigeix a la pàgina de login.
    };

    // ✅ Mostra un missatge "Pròximament" per funcionalitats no implementades.
    const handleNotImplemented = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(t('comingSoon'), { description: t('featureUnavailable') });
    };
    
    // ✅ Component intern per renderitzar cada element de navegació principal
    const NavItemComponent = ({ item, currentPath }: { item: NavItem; currentPath: string }) => {
        const activeCheckPath = item.basePath || item.path; // ✅ Determina quin path comprovar per activar.
        const isActive = cleanPathname.startsWith(activeCheckPath);// ✅ Comprova si és actiu.

        // ✅ Gestió de clics per obrir submenús o navegar
        const handleModuleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (!item.isSingle) { // ✅ Només per mòduls amb submenús
                const isAlreadyInModule = item.basePath && fullPathname.startsWith(`/${locale}${item.basePath}`);

                // ✅ Si ja estem dins del mòdul, evitem que el Link navegui novament.
                if (isAlreadyInModule) {
                    e.preventDefault();
                }
                // ✅ Notifiquem al pare quin mòdul s'ha seleccionat (per obrir submenú).
                onModuleSelect(item);
            }
            // ✅ Si és 'isSingle', el Link funciona normalment.
        };

        return (
            <Link
                href={`/${locale}${item.path}`}
                onClick={handleModuleClick}
                className={cn(
                    'flex items-center justify-center h-12 w-12 rounded-lg transition-colors group relative',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
            >
                <item.icon className="w-6 h-6" />
                {/* ✅ Tooltip amb etiqueta visible al passar el ratolí */}
                <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {t(item.labelKey)}
                </span>
            </Link>
        );
    };

    return (
        <>
            {/* ✅ Contenidor principal de la barra lateral */}
            <aside className="w-24 h-full glass-effect border-r border-border p-4 flex flex-col items-center">
                {/* ✅ Logo a la part superior */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r  to-pink-500 rounded-lg flex items-center justify-center">
                        <Image 
                            src={logo} 
                            alt={t('logoAlt')}
                            className="object-cover" 
                            priority
                        />
                    </div>
                </div>

                {/* ✅ Navegació principal */}
                <nav className="flex-1 flex flex-col items-center gap-4">
                {navModules.map(item => 
                        // ✅ Passem 'fullPathname' com a prop
                        <NavItemComponent key={item.id} item={item} currentPath={fullPathname} />
                    )}                </nav>

                {/* ✅ Elements de la part inferior: funcions addicionals i logout */}
                <div className="flex flex-col items-center gap-4 border-t border-border pt-4 mt-4">
                    {bottomItems.map(item => (
                        item.notImplemented 
                        ? <a key={item.id} href="#" onClick={handleNotImplemented} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted group relative"><item.icon className="w-6 h-6" /><span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t(item.labelKey as any)}</span></a>
                        : <NavItemComponent key={item.id} item={item} currentPath={fullPathname} />

                    ))}
                    {/* ✅ Botó de tancar sessió */}
                    <div onClick={() => setIsSignOutDialogOpen(true)} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer group relative">
                        <LogOut className="w-6 h-6" />
                        <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('signOut')}</span>
                    </div>
                </div>
            </aside>

            {/* ✅ Diàleg de confirmació per tancar sessió */}
            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                        {t('signOutConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {t('confirmSignOut')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}