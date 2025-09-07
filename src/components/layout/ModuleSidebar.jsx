import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ModuleSidebar = ({ module, onClose, onLinkClick }) => {
    if (!module || !module.children) return null;

    const handleLinkClick = () => {
        if (onLinkClick) onLinkClick();
    };

    return (
        // ESTIL PERQUÈ EL CONTINGUT NO ES DEFORMI DURANT L'ANIMACIÓ
        <div className="w-64 h-full glass-effect border-r border-border flex flex-col p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold pl-2">{module.label}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
            
            <nav className="flex flex-col gap-2">
                {module.children.map(item => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={handleLinkClick}
                        className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                            isActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default ModuleSidebar;