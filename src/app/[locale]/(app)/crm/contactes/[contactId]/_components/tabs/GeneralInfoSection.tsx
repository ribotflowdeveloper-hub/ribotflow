import { FC } from 'react';
import { EditableField } from '../EditableField';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

// ✅ 1. Importem el nou tipus de dades des de la nostra action
import { type ContactDetail } from '../../actions';
import { CONTACT_STATUS_MAP } from '@/config/contacts';

// ✅ 2. Importem el Combobox compartit
import { SupplierCombobox } from '@/components/shared/SupplierCombobox';

interface Props {
    // ✅ 3. El 'contact' ara és del tipus 'ContactDetail'
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

                <EditableField label={t('details.labels.email')} isEditing={isEditing} viewValue={contact.email || t('details.noData')} editComponent={<Input name="email" type="email" defaultValue={contact.email || ''} />} />

                <EditableField label={t('details.labels.phone')} isEditing={isEditing} viewValue={contact.telefon || t('details.noData')} editComponent={<Input name="telefon" defaultValue={contact.telefon || ''} />} />

                <EditableField label={t('details.labels.status')} isEditing={isEditing} viewValue={getStatusLabel(contact.estat)} editComponent={
                    <Select name="estat" defaultValue={contact.estat || undefined}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CONTACT_STATUS_MAP.map(s => <SelectItem key={s.code} value={s.code}>{t(`contactStatuses.${s.key}`)}</SelectItem>)}</SelectContent>
                    </Select>
                } />

                <EditableField label={t('details.labels.jobTitle')} isEditing={isEditing} viewValue={contact.job_title || t('details.noData')} editComponent={<Input name="job_title" defaultValue={contact.job_title || ''} />} />

                {/* --- AQUEST ÉS EL CANVI PRINCIPAL --- */}
                {/* Afegeix un nou EditableField per a l'empresa */}
                <EditableField
                    label={t('details.labels.company')} // Assegura't de tenir aquesta traducció
                    isEditing={isEditing}

                    // ✅ 4. Mode Vista: Mostrem el nom del proveïdor (si existeix)
                    // ✅ Mode Vista: Ara és un enllaç!
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
                    // ✅ 5. Mode Edició: Mostrem el Combobox adaptat
                    editComponent={
                        <SupplierCombobox
                            // 'name' és crucial per al FormData
                            name="supplier_id"
                            // 'defaultValue' és l'ID del proveïdor
                            defaultValue={contact.suppliers ? contact.suppliers.id : undefined}
                            // 'initialSupplier' és l'objecte per mostrar el nom per defecte
                            initialSupplier={contact.suppliers ? { id: contact.suppliers.id, nom: contact.suppliers.nom } : null}
                        />
                    }
                />
                {/* --- FI DEL CANVI --- */}

                <EditableField label={t('details.labels.industry')} isEditing={isEditing} viewValue={contact.industry || t('details.noData')} editComponent={<Input name="industry" defaultValue={contact.industry || ''} />} />

                <EditableField label={t('details.labels.leadSource')} isEditing={isEditing} viewValue={contact.lead_source || t('details.noData')} editComponent={<Input name="lead_source" defaultValue={contact.lead_source || ''} />} />

            </div>
        </div>
    );
};