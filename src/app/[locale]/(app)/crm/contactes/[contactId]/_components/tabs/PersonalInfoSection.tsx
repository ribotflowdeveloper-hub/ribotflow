// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/PersonalInfoSection.tsx (Refactoritzat)

import { FC } from 'react';
import { format } from 'date-fns';
import { type Locale } from 'date-fns';
import { useTranslations } from 'next-intl';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
// ✅ 1. Importem el tipus 'Database' i 'Json' per als camps JSONB.
import { type Database, type Json } from '@/types/supabase';

// ✅ 2. Definim el tipus 'Contact' a partir de la fila de la taula.
type Contact = Database['public']['Tables']['contacts']['Row'];

interface Props {
    contact: Contact;
    isEditing: boolean;
    dateLocale: Locale;
}

export const PersonalInfoSection: FC<Props> = ({ contact, isEditing, dateLocale }) => {
    const t = useTranslations('ContactDetailPage');

    const formattedBirthday = contact.birthday 
        ? format(new Date(contact.birthday), 'dd/MM/yyyy', { locale: dateLocale }) 
        : t('details.noData');

    // ✅ 3. Definim funcions segures per a accedir a les dades dels camps JSONB.
    const getAddressCity = (address: Json) => (address as { city?: string })?.city || '';
    const getSocialMediaLinkedin = (social: Json) => (social as { linkedin?: string })?.linkedin || '';
    const hobbiesString = Array.isArray(contact.hobbies) ? contact.hobbies.join(', ') : '';

    return (
        <div>
            <h3 className="text-2xl font-bold mb-6">{t('details.personalInfo')}</h3>
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
        </div>
    );
};