"use client";

import { useState, FC, ElementType } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '../OnboardingContext';
import { ServiceSelectionModal } from '../ServiceSelectionModal';
import { Input, type InputProps } from '@/components/ui/input';
import { Phone, Globe, Briefcase } from 'lucide-react';

const InputWithIcon: FC<InputProps & { icon: ElementType }> = ({ icon: Icon, ...props }) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input className="pl-10" {...props} />
    </div>
);

export const Step3 = ({ availableServices }: { availableServices: { id: number; name: string }[] }) => {
    const { formData, handleInputChange, handleToggleService } = useOnboarding();
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

    return (
        <>
            <ServiceSelectionModal
                isOpen={isServicesModalOpen}
                onClose={() => setIsServicesModalOpen(false)}
                availableServices={availableServices}
                selectedServices={formData.services}
                onToggleService={handleToggleService}
            />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <InputWithIcon icon={Phone} name="phone" type="tel" placeholder="Telèfon de contacte" value={formData.phone} onChange={handleInputChange} />
                <InputWithIcon icon={Globe} name="website" placeholder="Pàgina web (opcional) Ex: https://digitaistudios.com/ " value={formData.website} onChange={handleInputChange} />
                <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Serveis principals</label>
                    <button type="button" onClick={() => setIsServicesModalOpen(true)} className="w-full min-h-[40px] flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background text-left">
                        <Briefcase className="w-5 h-5 text-muted-foreground shrink-0" />
                        {formData.services.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {formData.services.map(service => (
                                    <span key={service} className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md text-xs">{service}</span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-muted-foreground">Fes clic per a seleccionar serveis</span>
                        )}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">Selecciona les categories que millor et defineixen.</p>
                </div>
            </motion.div>
        </>
    );
};