"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/config/navigation';

export function ModuleSidebar({ module, onClose }: { module: NavItem; onClose: () => void; }) {
    const pathname = usePathname();
    if (!module || !module.children) return null;

    return (
        <div className="w-64 h-full glass-effect border-r border-border flex flex-col p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold pl-2">{module.label}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
            
            <nav className="flex flex-col gap-2">
                {module.children.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            href={item.path}
                            className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};