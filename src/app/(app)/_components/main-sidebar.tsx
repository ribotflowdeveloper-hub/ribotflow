"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from "sonner"; // ✅ 1. Importem 'toast' de sonner
import { createClient } from '@/lib/supabase/client';
import { Sparkles, LogOut } from 'lucide-react';
import { navModules, bottomItems } from '@/config/navigation';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { NavItem } from '@/config/navigation';

export function MainSidebar({ onModuleSelect }: { onModuleSelect: (module: NavItem) => void }) {
    const pathname = usePathname();
    
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login'; 
    };

    const handleNotImplemented = (e: React.MouseEvent) => {
      e.preventDefault();
  // ✅ 3. Canviem la crida al nou sistema de 'toast'
        toast.info("Pròximament", {
            description: "🚧 Aquesta funcionalitat encara no està disponible.",
        });    };
    
    const NavItemComponent = ({ item }: { item: NavItem }) => {
        const activeCheckPath = item.basePath || item.path;
        const isActive = pathname.startsWith(activeCheckPath);
        
        // ✅ CANVI CLAU: Nova funció per gestionar el clic amb lògica condicional.
        const handleModuleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            // Aquesta lògica només s'aplica als mòduls que tenen submenús.
            if (!item.isSingle) {
                const isAlreadyInModule = item.basePath && pathname.startsWith(item.basePath);

                // Si ja estem dins del mòdul (ex: a /crm/pipeline), evitem que el Link navegui.
                if (isAlreadyInModule) {
                    e.preventDefault();
                }
                
                // En qualsevol cas, obrim o tanquem el submenú.
                onModuleSelect(item);
            }
            // Si és un 'isSingle', el component Link navega de forma normal sense fer res més.
        };

        return (
            <Link
                href={item.path}
                // ✅ CANVI: Assignem la nova funció de gestió del clic.
                onClick={handleModuleClick}
                className={cn(
                    'flex items-center justify-center h-12 w-12 rounded-lg transition-colors group relative',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                )}
            >
                <item.icon className="w-6 h-6" />
                <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.label}
                </span>
            </Link>
        );
    };

    return (
        <>
            <aside className="w-24 h-full glass-effect border-r border-border p-4 flex flex-col items-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                </div>
                <nav className="flex-1 flex flex-col items-center gap-4">
                    {navModules.map(item => <NavItemComponent key={item.id} item={item} />)}
                </nav>
                <div className="flex flex-col items-center gap-4 border-t border-border pt-4 mt-4">
                    {bottomItems.map(item => (
                        item.notImplemented 
                        ? <a key={item.id} href="#" onClick={handleNotImplemented} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted group relative"><item.icon className="w-6 h-6" /><span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span></a>
                        : <NavItemComponent key={item.id} item={item} />
                    ))}
                    <div onClick={() => setIsSignOutDialogOpen(true)} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer group relative">
                        <LogOut className="w-6 h-6" />
                        <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tancar Sessió</span>
                    </div>
                </div>
            </aside>

            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Estàs segur que vols tancar la sessió?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hauràs de tornar a iniciar sessió per accedir al teu compte.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sí, tanca la sessió
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

