"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type useSupplierForm } from '../_hooks/useSupplierForm';

// Tipus per a les props que rep del hook
type SupplierFormProps = ReturnType<typeof useSupplierForm>;

export function SupplierForm({
  isPending,
  formData,
  errors,
  handleFieldChange,
  handleSubmit,
  t // Funció de traducció
}: SupplierFormProps) {

  // ❌ Eliminem la variable 'isNew' que no s'utilitzava
  // const isNew = !('id' in formData) || !formData.id;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
           {/* ✅ Eliminem el segon argument (fallback string) */}
           {/* Assegura't que 'detailsCardTitle' existeix a SupplierDetailPage */}
           <CardTitle>{t('detailsCardTitle')}</CardTitle>
           {/* Assegura't que 'detailsCardDescription' existeix a SupplierDetailPage */}
           <CardDescription>{t('detailsCardDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="nom">{t('form.name')}</Label>
            <Input id="nom" value={formData.nom || ''} onChange={(e) => handleFieldChange('nom', e.target.value)} disabled={isPending}/>
            {errors.nom && <p className="text-sm text-red-500">{errors.nom}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nif">{t('form.nif')}</Label>
            <Input id="nif" value={formData.nif || ''} onChange={(e) => handleFieldChange('nif', e.target.value)} disabled={isPending}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('form.email')}</Label>
            <Input id="email" type="email" value={formData.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} disabled={isPending}/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">{t('form.phone')}</Label>
            <Input id="telefon" value={formData.telefon || ''} onChange={(e) => handleFieldChange('telefon', e.target.value)} disabled={isPending}/>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? t('form.saving') : t('form.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}