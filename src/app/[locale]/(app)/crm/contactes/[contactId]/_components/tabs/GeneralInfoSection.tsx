import { FC } from 'react';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import type { ContactDetail } from '@/lib/services/crm/contacts/contacts.service';
import { CONTACT_STATUS_MAP } from '@/config/contacts';
import { SupplierCombobox } from '@/components/shared/SupplierCombobox';

interface Props {
    contact: ContactDetail;
    isEditing: boolean;
    getStatusLabel: (code?: string | null) => string;
}

export const GeneralInfoSection: FC<Props> = ({ contact, isEditing, getStatusLabel }) => {
    const t = useTranslations('ContactDetailPage');
    return (
        <div>
            <h3 className="text-2xl font-bold mb-6">{t('details.generalInfo')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">

                {/* ✅ PAS 2: AFEGIR AQUEST CAMP 'nom' */}
                <EditableField 
                    label={t('details.labels.name')} // Afegeix 'name' a les traduccions
                    isEditing={isEditing} 
                    viewValue={contact.nom || t('details.noData')} 
                    editComponent={
                        <Input 
                            name="nom" // <-- AQUEST ÉS EL CAMP QUE FALTAVA
                            defaultValue={contact.nom || ''} 
                            required 
                        />
                    } 
                />

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
        </div>
    );
};