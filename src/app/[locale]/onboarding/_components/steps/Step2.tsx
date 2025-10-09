"use client";

import { motion } from 'framer-motion';
import { useOnboarding } from '../OnboardingContext';
import { AddressSearch } from '@/app/[locale]/_components/AddressSearch';
import { useTranslations } from 'next-intl';
import { Home, MapPin, Mailbox, Landmark } from 'lucide-react';

export const Step2 = () => {
    const { formData, handleAddressSelect } = useOnboarding();
    const t = useTranslations('OnboardingPage');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <AddressSearch onAddressSelect={handleAddressSelect} />
            {formData.address && (
                <div className="pt-4 text-sm text-muted-foreground border-t mt-4 space-y-3">
                    <div className="flex items-center gap-3"><Home className="w-4 h-4 text-primary shrink-0" /> <p><strong>{t('step2.streetLabel')}:</strong></p> <span>{formData.address.street}</span></div>
                    <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-primary shrink-0" /> <p><strong>{t('step2.cityLabel')}:</strong></p> <span>{formData.address.city}</span></div>
                    <div className="flex items-center gap-3"><Mailbox className="w-4 h-4 text-primary shrink-0" /> <p><strong>{t('step2.postcodeLabel')}:</strong></p> <span>{formData.address.postcode}</span></div>
                    <div className="flex items-center gap-3"><Landmark className="w-4 h-4 text-primary shrink-0" /> <p><strong>{t('step2.regionLabel')}:</strong></p> <span>{formData.address.region}</span></div>
                </div>
            )}
        </motion.div>
    );
};