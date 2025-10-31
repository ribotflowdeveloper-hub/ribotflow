"use client";

import React from 'react';
import { ModuleCard } from '@/components/shared/ModuleCard';
// MODIFICAT: Importem Fingerprint
import { List, Landmark, Plus, Fingerprint } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InvoiceItemsEditor } from '../InvoiceItemsEditor';
import { type UseInvoiceDetailReturn } from '../InvoiceDetailClient';
import { type InvoiceDetail } from '@/types/finances'; // MODIFICAT: Importem InvoiceDetail

// MODIFICAT: Afegim les noves props
interface InvoiceDetailMainProps {
  form: UseInvoiceDetailReturn;
  initialData: InvoiceDetail | null;
  isNew: boolean;
}

export function InvoiceDetailMain({ form, initialData, isNew }: InvoiceDetailMainProps) { // MODIFICAT: Acceptem les props
  const {
  	formData,
  	isLocked,
  	handleFieldChange,
  	handleItemChange,
  	handleAddItem,
  	handleRemoveItem,
  	t,
  } = form;

  return (
  	/* MODIFICAT: Canviem a 4 columnes per alinear-se amb el grid de dalt */
  	<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
  	  
  	  {/* 1. LÍNIES DE FACTURA (Ocupa 3/4 en LG) */}
  	  <ModuleCard
  	 	// MODIFICAT: Canviem a col-span-3 (perquè el pare és de 4)
  	 	className="lg:col-span-3"
  	 	title={t('card.invoiceItems')}
  	 	icon={List}
  	 	variant="sales"
  	 	isCollapsible={false} 
  	 	defaultOpen={true}
  	 	actions={
  	 	  <Button
  	 		type="button"
  	 		size="sm"
  	 		variant="outline" 
  	 		onClick={handleAddItem}
  	 		disabled={isLocked}
  	 		className="text-primary-foreground border-primary-foreground/50 hover:bg-white/10 hover:text-primary-foreground h-8"
  	 	  >
  	 		<Plus className="w-4 h-4 mr-2" /> {t('button.addItem')}
  	 	  </Button>
  	 	}
  	  >
  	 	<InvoiceItemsEditor
  	 	  items={formData.invoice_items || []}
  	 	  onItemChange={handleItemChange}
  	 	  onRemoveItem={handleRemoveItem}
  	 	  isSaving={isLocked}
  	 	  currency={formData.currency || 'EUR'}
  	 	  locale={formData.language || 'ca'}
  	 	/>
  	  </ModuleCard>

  	  {/* 2. TERMES I PAGAMENT (Ocupa 1/4 en LG) */}
  	  <ModuleCard
  	 	className="lg:col-span-1"
  	 	title={t('card.paymentTerms')}
  	 	icon={Landmark}
  	 	variant="tasks"
  	 	isCollapsible={true} 
  	 	defaultOpen={true}
  	  >
  	 	<div className="space-y-4">
  	 	  <div className="space-y-2">
  	 		<Label htmlFor="terms">{t('field.terms')}</Label>
  	 		<Textarea
  	 		  id="terms"
  	 		  value={formData.terms || ''}
  	 		  onChange={(e) => handleFieldChange('terms', e.target.value)}
  	 		  placeholder={t('placeholder.terms')}
  	 		  rows={3}
  	 		  disabled={isLocked}
  	 		/>
  	 	  </div>
  	 	  <div className="space-y-2">
  	 		<Label htmlFor="payment_details">{t('field.paymentDetails')}</Label>
  	 		<Textarea
  	 		  id="payment_details"
  	 		  value={formData.payment_details || ''}
  	 		  onChange={(e) => handleFieldChange('payment_details', e.target.value)}
  	 		  placeholder={t('placeholder.paymentDetails')}
  	 		  rows={3}
  	 		  disabled={isLocked}
  	 		/>
  	 	  </div>
  	 	</div>
  	  </ModuleCard>
  	  
  	  {/* 3. METADADES VERIFACTU (MOGUT AQUÍ) */}
  	  <ModuleCard
  	 	title={t('card.metadata')}
  	 	icon={Fingerprint}
  	 	variant="radar"
  	 	defaultOpen={false}
  	 	isVisible={!isNew && !!initialData && !!initialData.verifactu_uuid}
  	 	// Ocupa tot l'ample d'aquest grid
  	 	className="lg:col-span-4" 
  	  >
  	 	<div className="space-y-2 text-sm text-muted-foreground break-all">
  	 	  <p><strong>ID:</strong> {initialData?.id}</p>
  	 	  {initialData?.verifactu_uuid && (
  	 		<>
  	 		  <p><strong>VeriFactu ID:</strong> <span className='text-xs'>{initialData.verifactu_uuid}</span></p>
  	 		  <p><strong>Signatura:</strong> <span className='text-xs'>{initialData.verifactu_signature}</span></p>
  	 		  <p><strong>Ant:</strong> <span className='text-xs'>{initialData.verifactu_previous_signature || 'N/A'}</span></p>
  	 		</>
  	 	  )}
  	 	</div>
  	  </ModuleCard>
  	  
  	</div>
  );
}