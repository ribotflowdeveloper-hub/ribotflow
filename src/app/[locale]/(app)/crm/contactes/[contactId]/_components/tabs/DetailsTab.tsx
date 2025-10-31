// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/DetailsTab.tsx

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { format } from 'date-fns';
import { type Locale } from 'date-fns';
import { type Json } from '@/types/supabase';
import { type ContactDetail } from '../../actions';

// Importem els components necessaris
import { ModuleCard } from '@/components/shared/ModuleCard';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplierCombobox } from '@/components/shared/SupplierCombobox';

// Importem configuració i icones
import { CONTACT_STATUS_MAP } from '@/config/contacts';
import { User, Info, StickyNote } from 'lucide-react';

interface Props {
    contact: ContactDetail;
    isEditing: boolean;
    dateLocale: Locale;
    getStatusLabel: (code?: string | null) => string;
}

/**
 * Component de pestanya "Detalls" redissenyat.
 * Utilitza ModuleCard per a cada secció d'informació
 * i encapsula tota la lògica d'edició.
 */
export const DetailsTab: FC<Props> = ({ contact, isEditing, dateLocale, getStatusLabel }) => {
    const t = useTranslations('ContactDetailPage'); // t_contact_detail_page

    // --- Lògica extreta de PersonalInfoSection ---
    const formattedBirthday = contact.birthday 
        ? format(new Date(contact.birthday), 'dd/MM/yyyy', { locale: dateLocale }) 
        : t('details.noData');
    
    // Funcions segures per accedir a camps JSONB
    const getAddressCity = (address: Json) => (address as { city?: string })?.city || '';
    const getSocialMediaLinkedin = (social: Json) => (social as { linkedin?: string })?.linkedin || '';
    const hobbiesString = Array.isArray(contact.hobbies) ? contact.hobbies.join(', ') : '';
    // --- Fi de la lògica de PersonalInfoSection ---

    return (
        <div className="space-y-6">
            
            {/* ==============================================
                Targeta d'Informació General
            =============================================== */}
            <ModuleCard
                title={t('details.generalInfo')}
                icon={User}
                variant="info" // Pots canviar-ho per 'default' o un altre color
                // Només es pot col·lapsar si NO estem editant
                isCollapsible={!isEditing} 
                defaultOpen={true}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <EditableField 
                        label={t('details.labels.email')} 
                        isEditing={isEditing} 
                        viewValue={contact.email || t('details.noData')} 
                        editComponent={<Input name="email" type="email" defaultValue={contact.email || ''} />} 
                    />
                    <EditableField 
                        label={t('details.labels.phone')} 
                        isEditing={isEditing} 
                        viewValue={contact.telefon || t('details.noData')} 
                        editComponent={<Input name="telefon" defaultValue={contact.telefon || ''} />} 
                    />
                    <EditableField 
                        label={t('details.labels.status')} 
                        isEditing={isEditing} 
                        viewValue={getStatusLabel(contact.estat)} 
                        editComponent={
                            <Select name="estat" defaultValue={contact.estat || undefined}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{CONTACT_STATUS_MAP.map(s => <SelectItem key={s.code} value={s.code}>{t(`contactStatuses.${s.key}`)}</SelectItem>)}</SelectContent>
                            </Select>
                        } 
                    />
                    <EditableField 
                        label={t('details.labels.jobTitle')} 
                        isEditing={isEditing} 
                        viewValue={contact.job_title || t('details.noData')} 
                        editComponent={<Input name="job_title" defaultValue={contact.job_title || ''} />} 
                    />
                    <EditableField
                        label={t('details.labels.company')}
                        isEditing={isEditing}
                        viewValue={
                            contact.suppliers ? (
                                <Link
                                    href={`/finances/suppliers/${contact.suppliers.id}`}
                                    className="font-medium text-blue-600 hover:underline"
                                >
                                    {contact.suppliers.nom}
                                </Link>
                            ) : t('details.noData')
                        }
                        editComponent={
                            <SupplierCombobox
                                name="supplier_id"
                                defaultValue={contact.suppliers ? contact.suppliers.id : undefined}
                                initialSupplier={contact.suppliers ? { id: contact.suppliers.id, nom: contact.suppliers.nom } : null}
                            />
                        }
                    />
                    <EditableField 
                        label={t('details.labels.industry')} 
                        isEditing={isEditing} 
                        viewValue={contact.industry || t('details.noData')} 
                        editComponent={<Input name="industry" defaultValue={contact.industry || ''} />} 
                    />
                    <EditableField 
                        label={t('details.labels.leadSource')} 
                        isEditing={isEditing} 
                        viewValue={contact.lead_source || t('details.noData')} 
                        editComponent={<Input name="lead_source" defaultValue={contact.lead_source || ''} />} 
                    />
                </div>
            </ModuleCard>

            {/* ==============================================
                Targeta d'Informació Personal
            =============================================== */}
            <ModuleCard
                title={t('details.personalInfo')}
                icon={Info}
                variant="sales" // Pots canviar-ho per un altre color
                isCollapsible={!isEditing}
                defaultOpen={true}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <EditableField
                        label={t('details.labels.birthday')}
                        isEditing={isEditing}
                        viewValue={formattedBirthday}
                        editComponent={<Input type="date" name="birthday" defaultValue={contact.birthday || ''} />}
                    />
                    <EditableField
                        label={t('details.labels.city')}
                        isEditing={isEditing}
                        viewValue={getAddressCity(contact.address) || t('details.noData')}
                        editComponent={<Input name="address.city" defaultValue={getAddressCity(contact.address)} />}
                    />
                    <EditableField
                        label={t('details.labels.linkedin')}
                        isEditing={isEditing}
                        viewValue={getSocialMediaLinkedin(contact.social_media) || t('details.noData')}
                        editComponent={<Input name="social_media.linkedin" defaultValue={getSocialMediaLinkedin(contact.social_media)} />}
                    />
                    <EditableField
                        label={t('details.labels.children')}
                        isEditing={isEditing}
                        viewValue={contact.children_count ?? t('details.noData')}
                        editComponent={<Input type="number" name="children_count" defaultValue={contact.children_count ?? ''} />}
                    />
                    <EditableField
                        label={t('details.labels.partnerName')}
                        isEditing={isEditing}
                        viewValue={contact.partner_name || t('details.noData')}
                        editComponent={<Input name="partner_name" defaultValue={contact.partner_name || ''} />}
                    />
                    <EditableField
                        label={t('details.labels.hobbies')}
                        isEditing={isEditing}
                        viewValue={hobbiesString || t('details.noData')}
                        editComponent={<Input name="hobbies" defaultValue={hobbiesString} />}
                    />
                </div>
            </ModuleCard>

            {/* ==============================================
                Targeta de Notes
            =============================================== */}
            <ModuleCard
                title={t('details.notes')}
                icon={StickyNote}
                variant="activity" // Pots canviar-ho per un altre color
                isCollapsible={!isEditing}
                defaultOpen={true}
            >
                {isEditing ? (
                    <Textarea name="notes" defaultValue={contact.notes || ''} rows={6} />
                ) : (
                    <p className="text-base text-muted-foreground whitespace-pre-wrap min-h-[120px]">
                        {contact.notes || t('details.noNotes')}
                    </p>
                )}
            </ModuleCard>

        </div>
    );
};