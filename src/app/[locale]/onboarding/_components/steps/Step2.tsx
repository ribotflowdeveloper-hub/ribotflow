"use client";

import { motion } from 'framer-motion';
import { useOnboarding } from '../OnboardingContext';
import { AddressSearch } from '@/app/[locale]/_components/AddressSearch';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ✅ 1. IMPORTEM DE NOU ELS ICONES
import { Home, MapPin, Mailbox, Landmark } from 'lucide-react';

export const Step2 = () => {
    const { formData, handleAddressSelect, handleAddressChange } = useOnboarding();
    const t = useTranslations('OnboardingPage');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <AddressSearch onAddressSelect={handleAddressSelect} />
            
            {formData.address && (
                <div className="pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Camp del Carrer */}
                    <div className="space-y-2">
                        <Label htmlFor="street">{t('step2.streetLabel')}</Label>
                        {/* ✅ 2. AFEGIM EL CONTENIDOR I L'ICONE */}
                        <div className="relative flex items-center">
                            <Home className="absolute left-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="street"
                                value={formData.address.street ?? ''}
                                onChange={(e) => handleAddressChange('street', e.target.value)}
                                placeholder={t('step2.addressPlaceholder')}
                                className="pl-10" // <-- Donem espai a l'esquerra per a l'icone
                            />
                        </div>
                    </div>

                    {/* Camp de la Ciutat */}
                    <div className="space-y-2">
                        <Label htmlFor="city">{t('step2.cityLabel')}</Label>
                        <div className="relative flex items-center">
                            <MapPin className="absolute left-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="city"
                                value={formData.address.city ?? ''}
                                onChange={(e) => handleAddressChange('city', e.target.value)}
                                placeholder={t('step2.cityPlaceholder')}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Camp del Codi Postal */}
                    <div className="space-y-2">
                        <Label htmlFor="postcode">{t('step2.postcodeLabel')}</Label>
                        <div className="relative flex items-center">
                            <Mailbox className="absolute left-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="postcode"
                                value={formData.address.postcode ?? ''}
                                onChange={(e) => handleAddressChange('postcode', e.target.value)}
                                placeholder={t('step2.postcodePlaceholder')}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Camp de la Regió/Província */}
                    <div className="space-y-2">
                        <Label htmlFor="region">{t('step2.regionLabel')}</Label>
                        <div className="relative flex items-center">
                            <Landmark className="absolute left-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="region"
                                value={formData.address.region ?? ''}
                                onChange={(e) => handleAddressChange('region', e.target.value)}
                                placeholder={t('step2.regionLabel')}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};