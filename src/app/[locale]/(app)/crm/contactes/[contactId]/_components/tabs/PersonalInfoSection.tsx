import { FC } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { type Contact } from '@/types/crm';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';

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
                    viewValue={contact.address?.city || t('details.noData')}
                    editComponent={<Input name="address.city" defaultValue={contact.address?.city || ''} />}
                />
                <EditableField
                    label={t('details.labels.linkedin')}
                    isEditing={isEditing}
                    viewValue={contact.social_media?.linkedin || t('details.noData')}
                    editComponent={<Input name="social_media.linkedin" defaultValue={contact.social_media?.linkedin || ''} />}
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
                    viewValue={contact.hobbies?.join(', ') || t('details.noData')}
                    editComponent={<Input name="hobbies" defaultValue={contact.hobbies?.join(', ') || ''} />}
                />
            </div>
        </div>
    );
};