"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Users, Mail, Phone } from 'lucide-react';
import { type ContactForSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';

interface ContactsTabContentProps {
  contacts: ContactForSupplier[];
  supplierId: string; // Aquí ja sabem que no és null
  t: (key: string) => string; // Tipus de la funció de traducció (ajusta'l segons next-intl)
}

export function ContactsTabContent({ contacts, supplierId, t }: ContactsTabContentProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t('contactsCard.title')}</CardTitle>
          <CardDescription>{t('contactsCard.description')}</CardDescription>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/crm/contactes/new?supplierId=${supplierId}`)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('contactsCard.newButton')}
        </Button>
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
                    <Link href={`/crm/contactes/${contact.id}`} className="font-medium text-blue-600 hover:underline">{contact.nom}</Link>
                    {contact.job_title && (<span className="block text-xs text-muted-foreground">{contact.job_title}</span>)}
                  </TableCell>
                  <TableCell>{contact.email ? (<a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-3 w-3" /> {contact.email}</a>) : '-'}</TableCell>
                  <TableCell>{contact.telefon ? (<a href={`tel:${contact.telefon}`} className="flex items-center gap-2 hover:underline"><Phone className="h-3 w-3" /> {contact.telefon}</a>) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t('contactsCard.empty')}</p>
        )}
      </CardContent>
    </Card>
  );
}