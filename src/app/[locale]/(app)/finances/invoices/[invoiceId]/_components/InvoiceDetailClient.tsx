"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { type InvoiceDetail } from '@/types/finances';
import { useInvoiceDetail } from '../_hooks/useInvoiceDetail';
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';

// Nous components fills importats (amb la ruta que has especificat)
import { InvoiceDetailHeader } from './client/InvoiceDetailHeader';
import { InvoiceMetaGrid } from './client/InvoiceMetaGrid';
import { InvoiceMainContent } from './client/InvoiceMainContent';

// Definim el tipus 'Contact' correcte basat en l'esquema de la BD
type Contact = Database['public']['Tables']['contacts']['Row'];

interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null;
  contact: Contact | null;
  contacts: Contact[];
  isNew: boolean;
  title: string;
  description: string;
}

export function InvoiceDetailClient({
  initialData,
  company,
  contact,
  contacts = [],
  isNew,
  title,
  description,
}: InvoiceDetailClientProps) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from');

  const {
    formData,
    isPending,
    isFinalizing,
    isLocked,
    handleFieldChange,
    handleItemChange,
    handleAddItem,
    handleRemoveItem,
    handleSubmit,
    handleFinalize,
    t,
  } = useInvoiceDetail({ initialData, isNew });

  const isSaving = isPending || isFinalizing;
  const formIsDisabled = isSaving || isLocked;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contact);

  const handleBack = () => {
    if (fromUrl) {
      router.push(fromUrl);
    } else {
      router.push('/finances/invoices');
    }
  };

  const handleContactIdChange = (contactId: number | null) => {
    if (contactId === null) {
      setSelectedContact(null);
      handleFieldChange('contact_id', null);
    } else {
      const newContact = contacts.find(c => c.id === contactId);
      if (newContact) {
        setSelectedContact(newContact);
        handleFieldChange('contact_id', newContact.id);
      } else {
        setSelectedContact(null);
        handleFieldChange('contact_id', null);
      }
    }
  };

  return (
    <div className="px-6">
      {/* El formulari encapsula tots els components fills,
          permetent que el botó 'type="submit"' del Header funcioni */}
      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* --- 1. Barra d'Accions Sticky --- */}
        <InvoiceDetailHeader
          handleBack={handleBack}
          title={title}
          description={description}
          t={t}
          formIsDisabled={formIsDisabled}
          formData={formData} // ✅ Passa 'InvoiceFormData'
          handleFieldChange={handleFieldChange} // ✅ Passa el handler tipat amb 'InvoiceFormData'
          isPreviewOpen={isPreviewOpen}
          setIsPreviewOpen={setIsPreviewOpen}
          isSaving={isSaving}
          initialData={initialData}
          company={company}
          contact={selectedContact}
          isLocked={isLocked}
          isPending={isPending}
          isNew={isNew}
          handleFinalize={handleFinalize}
          isFinalizing={isFinalizing}
        />

        {/* --- 2. FILA SUPERIOR (4 Targetes) --- */}
        <InvoiceMetaGrid
          formData={formData} // ✅ Passa 'InvoiceFormData'
          handleFieldChange={handleFieldChange} // ✅ Passa el handler tipat amb 'InvoiceFormData'
          formIsDisabled={formIsDisabled}
          t={t}
          contacts={contacts}
          selectedContact={selectedContact}
          handleContactIdChange={handleContactIdChange}
          initialData={initialData}
          isNew={isNew}
        />

        {/* --- 3. SECCIÓ D'EDICIÓ (Contingut Principal) --- */}
        <InvoiceMainContent
          formData={formData} // ✅ Passa 'InvoiceFormData'
          handleFieldChange={handleFieldChange} // ✅ Passa el handler tipat amb 'InvoiceFormData'
          formIsDisabled={formIsDisabled}
          t={t}
          handleAddItem={handleAddItem}
          handleItemChange={handleItemChange}
          handleRemoveItem={handleRemoveItem}
        />
        
      </form>
    </div>
  );
}