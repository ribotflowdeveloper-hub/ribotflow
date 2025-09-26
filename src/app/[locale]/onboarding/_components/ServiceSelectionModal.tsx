"use client";

import React, { useState, useMemo, FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Importem l'Input per al cercador
import { Check, Search } from 'lucide-react'; // Importem la icona de cerca

// --- Component per a la targeta de servei individual (sense canvis) ---
const ServiceCard: FC<{ serviceName: string; isSelected: boolean; onClick: () => void; }> = ({ serviceName, isSelected, onClick }) => (
    <motion.button
        type="button"
        onClick={onClick}
        className={`relative w-full h-24 p-4 rounded-lg border-2 flex items-center justify-center text-center font-semibold transition-all duration-200 ease-in-out ${
            isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/50 border-transparent hover:border-primary/50'
        }`}
        whileTap={{ scale: 0.95 }}
    >
        {isSelected && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-3 h-3" />
            </div>
        )}
        {serviceName}
    </motion.button>
);


// --- Component per al diàleg modal (AMB LES MILLORES) ---
interface ServiceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableServices: { id: number; name: string }[];
    selectedServices: string[];
    onToggleService: (serviceName: string) => void;
}

export const ServiceSelectionModal: FC<ServiceSelectionModalProps> = ({ isOpen, onClose, availableServices, selectedServices, onToggleService }) => {
    // ✅ PAS 1: Afegim un estat per al terme de cerca
    const [searchTerm, setSearchTerm] = useState('');

    // ✅ PAS 2: Filtrem els serveis basant-nos en el terme de cerca
    const filteredServices = useMemo(() => {
        if (!searchTerm) {
            return availableServices;
        }
        return availableServices.filter(service =>
            service.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, availableServices]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-background rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold">Selecciona els teus serveis</h2>
                            {/* ✅ PAS 3: Augmentem la mida de la lletra de la descripció */}
                            <p className="text-muted-foreground mt-1 text-sm">Tria les categories que millor descriuen la teva activitat.</p>
                            
                            {/* ✅ PAS 4: Afegim el camp de cerca */}
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Cerca serveis..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* ✅ PAS 5: Renderitzem la llista filtrada */}
                        <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredServices.length > 0 ? (
                                filteredServices.map(service => (
                                    <ServiceCard
                                        key={service.id}
                                        serviceName={service.name}
                                        isSelected={selectedServices.includes(service.name)}
                                        onClick={() => onToggleService(service.name)}
                                    />
                                ))
                            ) : (
                                <p className="text-muted-foreground col-span-full text-center py-8">No s'han trobat serveis.</p>
                            )}
                        </div>
                        
                        <div className="p-6 border-t mt-auto flex justify-end">
                            <Button onClick={onClose} size="lg">Fet</Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};