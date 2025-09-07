import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, LogOut, X } from 'lucide-react';
import { navModules, bottomItems } from '@/config/navigation';

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

const Sidebar = ({ onClose, onModuleSelect }) => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleNotImplemented = (e) => { e.preventDefault(); toast({ title: "🚧 No implementat encara" }); };
    
    const handleItemClick = (item) => {
        if (onClose) onClose();
        if (onModuleSelect && !item.isSingle) {
            onModuleSelect(item);
        }
    };

    // --- AQUEST ÉS EL COMPONENT AMB LA LÒGICA CORREGIDA ---
    const NavItem = ({ item }) => {
        const path = item.isSingle ? item.path : item.basePath;
        const isActive = location.pathname.startsWith(path);
        
        // Si és un mòdul (no una pàgina única) i ja està actiu,
        // el clic només ha de gestionar el submenú, no navegar.
        // Per a això, fem servir un botó en lloc d'un NavLink.
        if (!item.isSingle && isActive) {
            return (
                <button
                    onClick={() => handleItemClick(item)}
                    className="flex items-center justify-center h-12 w-12 rounded-lg transition-colors group relative bg-primary text-primary-foreground"
                >
                    <item.icon className="w-6 h-6" />
                    <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.label}
                    </span>
                </button>
            );
        }

        // Si no és un mòdul actiu, el comportament és el normal: navegar.
        return (
            <NavLink
                to={path}
                onClick={() => handleItemClick(item)}
                className={`flex items-center justify-center h-12 w-12 rounded-lg transition-colors group relative ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
            >
                <item.icon className="w-6 h-6" />
                <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {item.label}
                </span>
            </NavLink>
        );
    };

    return (
        <>
            <motion.div initial={{ x: -100 }} animate={{ x: 0 }} exit={{ x: -100 }} transition={{ type: 'tween', duration: 0.3 }} className="w-24 h-full glass-effect border-r border-border p-4 flex flex-col items-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    {onClose && (<button onClick={onClose} className="absolute top-4 right-4 md:hidden"><X className="w-6 h-6" /></button>)}
                </div>
                <nav className="flex-1 flex flex-col items-center gap-4">
                    {navModules.map(item => <NavItem key={item.id} item={item} />)}
                </nav>
                <div className="flex flex-col items-center gap-4 border-t border-border pt-4 mt-4">
                    {bottomItems.map(item => (
                        item.notImplemented 
                        ? <a key={item.id} href="#" onClick={handleNotImplemented} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted group relative"><item.icon className="w-6 h-6" /><span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span></a>
                        : <NavLink key={item.id} to={item.path} onClick={() => handleItemClick(item)} className={`flex items-center justify-center h-12 w-12 rounded-lg transition-colors group relative ${location.pathname.startsWith(item.path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><item.icon className="w-6 h-6" /><span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.label}</span></NavLink>
                    ))}
                    <div onClick={() => setIsSignOutDialogOpen(true)} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer group relative">
                        <LogOut className="w-6 h-6" />
                        <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tancar Sessió</span>
                    </div>
                </div>
            </motion.div>

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
};

export default Sidebar;
