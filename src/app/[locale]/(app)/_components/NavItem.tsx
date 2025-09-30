// Ubicació: /components/layout/NavItem.tsx (o on guardis els teus components)

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getCleanPathname } from '@/lib/utils/utils';
import type { NavItem as NavItemType } from '@/types/navigation';

// Definim les propietats que rebrà el nostre component
interface NavItemProps {
    item: NavItemType;
    onClick: (e: React.MouseEvent<HTMLAnchorElement>, item: NavItemType) => void;
    t: (key: string) => string; // Passem la funció de traducció per mantenir el component pur
}

export function NavItem({ item, onClick, t }: NavItemProps) {
    const fullPathname = usePathname();
    const locale = useLocale();
    
    // La lògica per determinar si l'ítem està actiu
    const activeCheckPath = item.basePath || item.path;
    const isActive = getCleanPathname(fullPathname, locale).startsWith(activeCheckPath);

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link
                        href={`/${locale}${item.path}`}
                        onClick={(e) => onClick(e, item)} // Cridem a la funció del pare
                        className={cn(
                            'flex items-center justify-center h-12 w-12 rounded-lg transition-colors relative',
                            isActive 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:bg-muted'
                        )}
                        aria-label={t(item.labelKey)}
                    >
                        <item.icon className="w-6 h-6" />
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                    <p>{t(item.labelKey)}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}