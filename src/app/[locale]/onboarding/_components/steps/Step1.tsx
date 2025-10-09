"use client";

import { FC, ElementType } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '../OnboardingContext';
import { Input, type InputProps } from '@/components/ui/input';
import { User, Building, FileText } from 'lucide-react';

const InputWithIcon: FC<InputProps & { icon: ElementType }> = ({ icon: Icon, ...props }) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input className="pl-10" {...props} />
    </div>
);

export const Step1 = () => {
    const { formData, handleInputChange } = useOnboarding();

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <InputWithIcon icon={User} name="full_name" placeholder="El teu nom i cognoms" value={formData.full_name} onChange={handleInputChange} required />
            <InputWithIcon icon={Building} name="company_name" placeholder="Nom de la teva empresa o marca" value={formData.company_name} onChange={handleInputChange} required />
            <InputWithIcon icon={FileText} name="tax_id" placeholder="NIF/CIF (opcional)" value={formData.tax_id} onChange={handleInputChange} />
        </motion.div>
    );
};