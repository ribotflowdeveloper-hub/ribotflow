"use client";

import { type Supplier } from '@/types/finances/suppliers';
// ✅ 1. Importem el tipus dels contactes
import { type ContactForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { useSupplierForm } from '../_hooks/useSupplierForm';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// ✅ 2. Imports per a la nova taula/llista de contactes
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Mail, Phone } from 'lucide-react';

interface SupplierDetailClientProps {
  initialData: Supplier | null;
  supplierId: string | null;
  // ✅ 3. Acceptem la nova prop de contactes
  contacts: ContactForSupplier[];
}

export function SupplierDetailClient({ initialData, supplierId, contacts }: SupplierDetailClientProps) {
  const {
    isPending,
    formData,
    errors,
    handleFieldChange,
    handleSubmit,
    t,
  } = useSupplierForm({ initialData, supplierId });

  const isNew = supplierId === null;

  return (
    // ✅ 4. Embolcallem tot en un <div> o <React.Fragment>
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{isNew ? t('createTitle') : t('editTitle')}</CardTitle>
            <CardDescription>{isNew ? t('createDescription') : t('editDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ... (Tots els camps del formulari: Nom, NIF, Email, Telèfon) ... */}
            {/* Camp Nom */}
            <div className="space-y-2">
              <Label htmlFor="nom">{t('form.name')}</Label>
              <Input
                id="nom"
                value={formData.nom || ''}
                onChange={(e) => handleFieldChange('nom', e.target.value)}
                disabled={isPending}
              />
              {errors.nom && <p className="text-sm text-red-500">{errors.nom}</p>}
            </div>

            {/* Camp NIF */}
            <div className="space-y-2">
              <Label htmlFor="nif">{t('form.nif')}</Label>
              <Input
                id="nif"
                value={formData.nif || ''}
                onChange={(e) => handleFieldChange('nif', e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Camp Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Camp Telèfon */}
            <div className="space-y-2">
              <Label htmlFor="telefon">{t('form.phone')}</Label>
              <Input
                id="telefon"
                value={formData.telefon || ''}
                onChange={(e) => handleFieldChange('telefon', e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Botó de Desar */}
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? t('form.saving') : t('form.save')}
              </Button>
            </div>

          </CardContent>
        </Card>
      </form>

      {/* ✅ 5. NOVA CARD per mostrar contactes (només si estem editant) */}
      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('contactsCard.title')} ({contacts.length})
            </CardTitle>
            <CardDescription>{t('contactsCard.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contactsCard.table.name')}</TableHead>
                    <TableHead>{t('contactsCard.table.email')}</TableHead>
                    <TableHead>{t('contactsCard.table.phone')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link 
                          href={`/crm/contactes/${contact.id}`} 
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {contact.nom}
                        </Link>
                        {contact.job_title && (
                          <span className="block text-xs text-muted-foreground">
                            {contact.job_title}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                           <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline">
                             <Mail className="h-3 w-3" /> {contact.email}
                           </a>
                        ) : '-'}
                      </TableCell>
                       <TableCell>
                        {contact.telefon ? (
                           <a href={`tel:${contact.telefon}`} className="flex items-center gap-2 hover:underline">
                             <Phone className="h-3 w-3" /> {contact.telefon}
                           </a>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{t('contactsCard.empty')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}