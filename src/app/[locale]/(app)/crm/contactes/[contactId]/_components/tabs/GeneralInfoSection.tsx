import { FC } from 'react';
import { type Contact, CONTACT_STATUS_MAP } from '@/types/crm';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface Props { contact: Contact; isEditing: boolean; getStatusLabel: (code?: string) => string; }

export const GeneralInfoSection: FC<Props> = ({ contact, isEditing, getStatusLabel }) => {
    const t = useTranslations('ContactDetailPage');
    return (
        <div>
            <h3 className="text-2xl font-bold mb-6">{t('details.generalInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <EditableField label={t('details.labels.email')} isEditing={isEditing} viewValue={contact.email || t('details.noData')} editComponent={<Input name="email" type="email" defaultValue={contact.email || ''} />} />
                <EditableField label={t('details.labels.phone')} isEditing={isEditing} viewValue={contact.telefon || t('details.noData')} editComponent={<Input name="telefon" defaultValue={contact.telefon || ''} />} />
                <EditableField label={t('details.labels.status')} isEditing={isEditing} viewValue={getStatusLabel(contact.estat)} editComponent={
                    <Select name="estat" defaultValue={contact.estat || undefined}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CONTACT_STATUS_MAP.map(s => <SelectItem key={s.code} value={s.code}>{t(`contactStatuses.${s.key}`)}</SelectItem>)}</SelectContent>
                    </Select>
                } />
                <EditableField label={t('details.labels.jobTitle')} isEditing={isEditing} viewValue={contact.job_title || t('details.noData')} editComponent={<Input name="job_title" defaultValue={contact.job_title || ''} />} />
                <EditableField label={t('details.labels.industry')} isEditing={isEditing} viewValue={contact.industry || t('details.noData')} editComponent={<Input name="industry" defaultValue={contact.industry || ''} />} />
                <EditableField label={t('details.labels.leadSource')} isEditing={isEditing} viewValue={contact.lead_source || t('details.noData')} editComponent={<Input name="lead_source" defaultValue={contact.lead_source || ''} />} />
            </div>
        </div>
    );
};