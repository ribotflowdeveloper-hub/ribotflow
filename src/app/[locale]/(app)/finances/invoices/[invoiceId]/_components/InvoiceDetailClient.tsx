"use client";

import React, { useState } from 'react';
// ✅ 1. Importem 'useRouter' per refrescar
import { useSearchParams, useRouter } from 'next/navigation'; 
import { type InvoiceDetail } from '@/types/finances';
import { useInvoiceDetail } from '../_hooks/useInvoiceDetail';
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';
import { toast } from 'sonner'; 
import { sendInvoiceByEmailAction } from '../actions'; 

// Nous components fills importats
import { InvoiceDetailHeader } from './client/InvoiceDetailHeader';
import { InvoiceMetaGrid } from './client/InvoiceMetaGrid';
import { InvoiceMainContent } from './client/InvoiceMainContent';

// Definim el tipus 'Contact' correcte
type Contact = Database['public']['Tables']['contacts']['Row'];
type Product = Database['public']['Tables']['products']['Row'];

interface InvoiceDetailClientProps {
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null;
  contact: Contact | null;
  contacts: Contact[];
  products: Product[]; 
  userId: string;       
  teamId: string;       
  isNew: boolean;
  title: string;
  description: string;
}

export function InvoiceDetailClient({
  initialData,
  company,
  contact,
  contacts = [],
  products,     
  userId,       
  teamId,       
  isNew,
  title,
  description,
}: InvoiceDetailClientProps) {

  const router = useRouter(); // ✅ 2. Instanciem el router
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
    handleAddProductFromLibrary, 
    handleRemoveItem,
    handleSubmit,
    handleFinalize: hookHandleFinalize, // ✅ 4. Renombrem la funció del hook
    t,
  } = useInvoiceDetail({ 
        initialData, 
        isNew, 
        userId, 
        teamId 
    });

  // 'isSaving' i 'formIsDisabled' es mantenen igual
  const isSaving = isPending || isFinalizing;
  const formIsDisabled = isSaving || isLocked;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contact);

  const [isSendEmailDialogOpen, setIsSendEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  const handleSendEmail = async (recipientEmail: string, messageBody: string) => {
    // Obtenim l'ID correcte (pot ser que initialData sigui null si és nova)
    const invoiceId = formData.id || initialData?.id;

    if (!invoiceId || !recipientEmail) {
      toast.error(t('errors.missingEmailData') || "Falten dades per enviar l'email.");
      return;
    }
    
    setIsSendingEmail(true);
    const result = await sendInvoiceByEmailAction(
      invoiceId, 
      recipientEmail, 
      messageBody
    );
    setIsSendingEmail(false);

    if (result.success) {
      toast.success(result.message || "Email enviat correctament.");
      setIsSendEmailDialogOpen(false); 
    } else {
      toast.error(result.message || "Error a l'enviar l'email.");
    }
  };

  // ✅ 5. Wrapper per a 'handleFinalize'
  const handleFinalizeWrapper = async () => {
    
    // Cridem la funció del hook, que ara retorna el resultat
    const result = await hookHandleFinalize(); 

    // ✅ 6. Aquesta comprovació ARA FUNCIONARÀ
    if (result && result.success) {
      // El hook ja ha actualitzat l'estat local ('setFormData' i 'setIsLocked')
      // i ha cridat a 'router.refresh()',
      // així que aquí no cal fer res més.
      console.log("Finalize successful, state updated by hook.");
    } else {
      // El hook ja ha mostrat el toast d'error
      console.log("Finalize failed, error handled by hook.");
    }
  };


  return (
    <div className="">
      <form onSubmit={handleSubmit} className="space-y-3">
        
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
          
          handleFinalize={handleFinalizeWrapper} // ✅ Passem el nou wrapper
          
          isFinalizing={isFinalizing}
          isSendEmailDialogOpen={isSendEmailDialogOpen}
          setIsSendEmailDialogOpen={setIsSendEmailDialogOpen}
          handleSendEmail={handleSendEmail}
          isSendingEmail={isSendingEmail}
        />

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

        <InvoiceMainContent
          formData={formData} 
          handleFieldChange={handleFieldChange} 
          formIsDisabled={formIsDisabled}
          t={t}
          products={products} 
          handleAddItem={handleAddItem} 
          handleAddProductFromLibrary={handleAddProductFromLibrary} 
          handleItemChange={handleItemChange}
          handleRemoveItem={handleRemoveItem}
        />
        
      </form>
    </div>
  );
}