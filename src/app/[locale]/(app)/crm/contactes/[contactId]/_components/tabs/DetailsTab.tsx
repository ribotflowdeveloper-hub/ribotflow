// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/DetailsTab.tsx
import { FC } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format } from 'date-fns';
import { type Locale } from 'date-fns';
import type { ContactDetail } from '@/lib/services/crm/contacts/contacts.service';

// Components UI
import { ModuleCard } from '@/components/shared/ModuleCard';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplierCombobox } from '@/components/shared/SupplierCombobox';

// Config & Icons
import { CONTACT_STATUS_MAP } from '@/config/contacts';
import { User, Info, StickyNote, Briefcase } from 'lucide-react';

interface Props {
    contact: ContactDetail;
    isEditing: boolean;
    dateLocale: Locale;
    getStatusLabel: (code?: string | null) => string;
}

// ✅ 1. Definim interfícies per a les estructures JSON
// Això evita l'ús de 'any' i satisfà el linter
interface AddressData {
    city?: string;
    country?: string;
    zip?: string;
}

interface SocialMediaData {
    linkedin?: string;
    twitter?: string;
}

export const DetailsTab: FC<Props> = ({ contact, isEditing, dateLocale, getStatusLabel }) => {
    const t = useTranslations('ContactDetailPage');

    // Helpers per mostrar dades complexes
    const formattedBirthday = contact.birthday 
        ? format(new Date(contact.birthday), 'P', { locale: dateLocale }) 
        : t('details.noData');
    
    // ✅ 2. Casting segur (unknown -> Tipus Específic) en lloc de 'any'
    const addressData = contact.address as unknown as AddressData | null;
    const addressCity = addressData?.city || '';

    const socialData = contact.social_media as unknown as SocialMediaData | null;
    const linkedin = socialData?.linkedin || '';
    
    const hobbies = Array.isArray(contact.hobbies) ? contact.hobbies.join(', ') : '';

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* COLUMNA ESQUERRA */}
            <div className="space-y-6">
                {/* --- Info General --- */}
                <ModuleCard title={t('details.generalInfo')} icon={User} defaultOpen={true}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <EditableField 
                            label={t('details.labels.email')} 
                            isEditing={isEditing} 
                            viewValue={contact.email} 
                            editComponent={<Input name="email" type="email" defaultValue={contact.email || ''} />} 
                        />
                        <EditableField 
                            label={t('details.labels.phone')} 
                            isEditing={isEditing} 
                            viewValue={contact.telefon} 
                            editComponent={<Input name="telefon" defaultValue={contact.telefon || ''} />} 
                        />
                        <div className="sm:col-span-2">
                            <EditableField 
                                label={t('details.labels.status')} 
                                isEditing={isEditing} 
                                viewValue={getStatusLabel(contact.estat)} 
                                editComponent={
                                    <Select name="estat" defaultValue={contact.estat || 'Lead'}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CONTACT_STATUS_MAP.map(s => (
                                                <SelectItem key={s.code} value={s.code}>
                                                    {t(`contactStatuses.${s.key}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                } 
                            />
                        </div>
                    </div>
                </ModuleCard>

                {/* --- Notes --- */}
                <ModuleCard title={t('details.notes')} icon={StickyNote} defaultOpen={true}>
                    {isEditing ? (
                        <Textarea 
                            name="notes" 
                            defaultValue={contact.notes || ''} 
                            placeholder={t('details.placeholders.notes')}
                            className="min-h-[150px]" 
                        />
                    ) : (
                        <div className="bg-muted/30 p-4 rounded-md min-h-[100px] text-sm whitespace-pre-wrap">
                            {contact.notes || <span className="text-muted-foreground italic">{t('details.noNotes')}</span>}
                        </div>
                    )}
                </ModuleCard>
            </div>

            {/* COLUMNA DRETA */}
            <div className="space-y-6">
                 {/* --- Dades Professionals --- */}
                 <ModuleCard title={t('details.professionalInfo')} icon={Briefcase} defaultOpen={true}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <EditableField 
                            label={t('details.labels.jobTitle')} 
                            isEditing={isEditing} 
                            viewValue={contact.job_title} 
                            editComponent={<Input name="job_title" defaultValue={contact.job_title || ''} />} 
                        />
                        <EditableField 
                            label={t('details.labels.industry')} 
                            isEditing={isEditing} 
                            viewValue={contact.industry} 
                            editComponent={<Input name="industry" defaultValue={contact.industry || ''} />} 
                        />
                        <div className="sm:col-span-2">
                            <EditableField
                                label={t('details.labels.company')}
                                isEditing={isEditing}
                                viewValue={
                                    contact.suppliers ? (
                                        <Link href={`/finances/suppliers/${contact.suppliers.id}`} className="text-primary hover:underline">
                                            {contact.suppliers.nom}
                                        </Link>
                                    ) : t('details.noData')
                                }
                                editComponent={
                                    <SupplierCombobox
                                        name="supplier_id"
                                        defaultValue={contact.suppliers?.id}
                                        initialSupplier={contact.suppliers}
                                    />
                                }
                            />
                        </div>
                        <EditableField 
                            label={t('details.labels.leadSource')} 
                            isEditing={isEditing} 
                            viewValue={contact.lead_source} 
                            editComponent={<Input name="lead_source" defaultValue={contact.lead_source || ''} />} 
                        />
                    </div>
                </ModuleCard>

                {/* --- Dades Personals --- */}
                <ModuleCard title={t('details.personalInfo')} icon={Info} defaultOpen={false}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <EditableField
                            label={t('details.labels.birthday')}
                            isEditing={isEditing}
                            viewValue={formattedBirthday}
                            editComponent={<Input type="date" name="birthday" defaultValue={contact.birthday || ''} />}
                        />
                         <EditableField
                            label={t('details.labels.city')}
                            isEditing={isEditing}
                            viewValue={addressCity}
                            editComponent={<Input name="address.city" defaultValue={addressCity} />}
                        />
                         <EditableField
                            label={t('details.labels.linkedin')}
                            isEditing={isEditing}
                            viewValue={linkedin ? <a href={linkedin} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn Profile</a> : t('details.noData')}
                            editComponent={<Input name="social_media.linkedin" defaultValue={linkedin} placeholder="https://linkedin.com/in/..." />}
                        />
                         <EditableField
                            label={t('details.labels.children')}
                            isEditing={isEditing}
                            viewValue={contact.children_count}
                            editComponent={<Input type="number" name="children_count" defaultValue={contact.children_count ?? ''} />}
                        />
                        <div className="sm:col-span-2">
                            <EditableField
                                label={t('details.labels.hobbies')}
                                isEditing={isEditing}
                                viewValue={hobbies}
                                editComponent={<Input name="hobbies" defaultValue={hobbies} placeholder="Futbol, Lectura..." />}
                            />
                        </div>
                    </div>
                </ModuleCard>
            </div>
        </div>
    );
};