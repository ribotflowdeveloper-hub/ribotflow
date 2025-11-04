// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/tabs/ContactsTabContent.tsx (MILLORAT PER A MÒBIL)
"use client";

import { useState, useTransition } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PlusCircle, Users, Mail, Phone, Link2,
  Trash2, Loader2 
} from 'lucide-react';
import { unlinkContactFromSupplier } from '@/app/[locale]/(app)/crm/contactes/actions';
import { LinkContactDialog } from '../LinkContactDialog';
import type { Contact , ContactForSupplier } from "@/types/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; 
import { toast } from 'sonner';

interface ContactsTabContentProps {
  contacts: ContactForSupplier[];
  supplierId: string;
  t: (key: string, values?: Record<string, unknown>) => string; 
}

export function ContactsTabContent({ contacts: initialContactsProp, supplierId, t }: ContactsTabContentProps) {
  const router = useRouter();

  const [contacts, setContacts] = useState(initialContactsProp || []);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isUnlinking, startUnlinkTransition] = useTransition();

  const handleLinkSuccess = (newlyLinkedContact: Contact) => {
    setContacts(prevContacts => [
      ...prevContacts,
      {
        id: newlyLinkedContact.id,
        nom: newlyLinkedContact.nom,
        job_title: newlyLinkedContact.job_title || null,
        email: newlyLinkedContact.email || null,
        telefon: newlyLinkedContact.telefon || null,
      } as ContactForSupplier
    ]);
  };

  const handleUnlink = (contactId: number) => {
    startUnlinkTransition(async () => {
      const result = await unlinkContactFromSupplier(String(contactId), supplierId);
      if (result.success) {
        toast.success(result.message);
        setContacts(prev => prev.filter(c => c.id !== contactId));
      } else {
        toast.error(result.message || "Error en desvincular.");
      }
    });
  };

  return (
    <>
      <Card>
        {/* ✅ MILLORA MÒBIL: Capçalera apilable */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t('contactsCard.title')}</CardTitle>
            <CardDescription>{t('contactsCard.description')}</CardDescription>
          </div>
           {/* ✅ MILLORA MÒBIL: Botons apilables i amplada completa en mòbil */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkDialogOpen(true)}
              className="w-full sm:w-auto" // Amplada adaptativa
            >
              <Link2 className="h-4 w-4 mr-2" />
              {t('contactsCard.linkButton')}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/crm/contactes/new?supplierId=${supplierId}`)}
              className="w-full sm:w-auto" // Amplada adaptativa
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('contactsCard.newButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('contactsCard.table.name')}</TableHead>
                  {/* ✅ MILLORA MÒBIL: Amaguem Email en pantalles mitjanes/petites */}
                  <TableHead className="hidden md:table-cell">{t('contactsCard.table.email')}</TableHead>
                  {/* ✅ MILLORA MÒBIL: Amaguem Telèfon en pantalles petites */}
                  <TableHead className="hidden sm:table-cell">{t('contactsCard.table.phone')}</TableHead>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Accions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        href={`/crm/contactes/${contact.id}?from=/finances/suppliers/${supplierId}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {contact.nom}
                      </Link>
                    </TableCell>
                    {/* ✅ MILLORA MÒBIL: Amaguem Email */}
                    <TableCell className="hidden md:table-cell">{contact.email ? (<a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline"><Mail className="h-3 w-3" /> {contact.email}</a>) : '-'}</TableCell>
                    {/* ✅ MILLORA MÒBIL: Amaguem Telèfon */}
                    <TableCell className="hidden sm:table-cell">{contact.telefon ? (<a href={`tel:${contact.telefon}`} className="flex items-center gap-2 hover:underline"><Phone className="h-3 w-3" /> {contact.telefon}</a>) : '-'}</TableCell>

                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={isUnlinking}
                          >
                            <span className="sr-only">Desvincular contacte</span>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('contactsCard.unlinkDialog.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('contactsCard.unlinkDialog.description', { contactName: contact.nom })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleUnlink(contact.id)}
                              disabled={isUnlinking}
                            >
                              {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desvincular"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

      <LinkContactDialog
        supplierId={supplierId}
        isOpen={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        t={t}
        onLinkSuccess={handleLinkSuccess}
      />
    </>
  );
}