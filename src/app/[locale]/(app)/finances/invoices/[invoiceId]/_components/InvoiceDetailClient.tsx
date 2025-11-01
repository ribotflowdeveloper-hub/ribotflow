"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { type InvoiceDetail } from '@/types/finances';
import { useInvoiceDetail } from '../_hooks/useInvoiceDetail';
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';

// Nous components fills importats
import { InvoiceDetailHeader } from './client/InvoiceDetailHeader';
import { InvoiceMetaGrid } from './client/InvoiceMetaGrid';
import { InvoiceMainContent } from './client/InvoiceMainContent';

// Definim el tipus 'Contact' correcte
type Contact = Database['public']['Tables']['contacts']['Row'];
// ✅ 1. Importem el tipus 'Product'
type Product = Database['public']['Tables']['products']['Row'];

interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null;
  contact: Contact | null;
  contacts: Contact[];
  products: Product[]; // ✅ 2. Acceptem la llista de productes
  userId: string;      // ✅ 3. Acceptem el userId
  teamId: string;      // ✅ 4. Acceptem el teamId
  isNew: boolean;
  title: string;
  description: string;
}

export function InvoiceDetailClient({
  initialData,
  company,
  contact,
  contacts = [],
  products,     // ✅ 5. Rebem la llista de productes
  userId,       // ✅ 6. Rebem el userId
  teamId,       // ✅ 7. Rebem el teamId
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
    handleAddProductFromLibrary, // ✅ 8. Rebem el nou handler del hook
    handleRemoveItem,
    handleSubmit,
    handleFinalize,
    t,
  } = useInvoiceDetail({ 
        initialData, 
        isNew, 
        userId, // ✅ 9. Passem userId al hook
        teamId  // ✅ 10. Passem teamId al hook
    });

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
    <div className="">
      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* --- 1. Barra d'Accions Sticky --- */}
        <InvoiceDetailHeader
          handleBack={handleBack}
          title={title}
          description={description}
          t={t}
          formIsDisabled={formIsDisabled}
          formData={formData} 
          handleFieldChange={handleFieldChange} 
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
          formData={formData} 
          handleFieldChange={handleFieldChange} 
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
          formData={formData} 
          handleFieldChange={handleFieldChange} 
          formIsDisabled={formIsDisabled}
          t={t}
          products={products} // ✅ 11. Passem els productes al component fill
          handleAddItem={handleAddItem} // Per afegir manualment
          handleAddProductFromLibrary={handleAddProductFromLibrary} // ✅ 12. Passem el handler de productes
          handleItemChange={handleItemChange}
          handleRemoveItem={handleRemoveItem}
        />
        
      </form>
    </div>
  );
}