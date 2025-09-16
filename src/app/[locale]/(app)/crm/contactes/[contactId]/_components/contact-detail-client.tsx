"use client";

import React, { useState, useTransition, FC, ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from "sonner"; // ✅ Canviem la importació
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Briefcase, FileText, Receipt, Activity as ActivityIcon, Edit, Ban, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';

import { deleteContactAction, updateContactAction } from './actions';
import { type Contact, type Quote, type Opportunity, type Invoice, type Activity, CONTACT_STATUSES } from '@/types/crm'; // Use central types
import { Trash } from "lucide-react";
import { ca, es, enUS } from 'date-fns/locale';// Importem el tipus de dades definit a la pàgina del servidor per a consistència.
import { useTranslations, useLocale } from 'next-intl'; // ✅ Importem hooks d'idioma

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
/**
 * Mostra una etiqueta d'estat acolorida. Reutilitzable per a pressupostos, oportunitats, etc.
 */


const StatusBadge: FC<{ status?: string | null }> = ({ status }) => {
    const t = useTranslations('ContactDetailPage.status');
    
    // ✅ 1. Valors per defecte
    let colorClass = 'bg-muted text-muted-foreground';
    let text = status || t('notAvailable');

    // ✅ 2. El switch gestiona TOT: el text traduït i el color
    switch (status?.toLowerCase()) {
        case 'draft':
            text = t('draft');
            colorClass = 'bg-yellow-500/10 text-yellow-500';
            break;
        case 'sent':
            text = t('sent');
            colorClass = 'bg-blue-500/10 text-blue-500';
            break;
        case 'accepted':
        case 'guanyat':
        case 'paid':
            text = t('wonPaid');
            colorClass = 'bg-green-500/10 text-green-500';
            break;
        case 'declined':
        case 'perdut':
            text = t('rejected');
            colorClass = 'bg-red-500/10 text-red-500';
            break;
        case 'negociació':
            text = t('negotiation');
            colorClass = 'bg-purple-500/10 text-purple-500';
            break;
        case 'overdue':
            text = t('overdue');
            colorClass = 'bg-orange-500/10 text-orange-500';
            break;
    }

    // ✅ 3. Renderitzem el resultat final
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colorClass}`}>{text}</span>;
};
/**
 * Un 'trigger' de pestanya que inclou una icona i un comptador de resultats.
 */
const TabTriggerWithCount: FC<{ value: string, icon: ElementType, count: number, label: string }> = ({ value, icon: Icon, count, label }) => (
  <TabsTrigger value={value} className="flex items-center gap-2 text-sm px-4">
    <Icon className="w-4 h-4" />
    <span className="font-semibold">{label}</span>
    {count > 0 && <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-primary/20 text-primary">{count}</span>}
  </TabsTrigger>
);
// Definim les propietats que rep el component principal.
interface ContactDetailClientProps {
  initialContact: Contact; // Les dades inicials del contacte, carregades al servidor.
  initialRelatedData: { // Dades relacionades amb aquest contacte (pressupostos, factures, etc.).
    quotes: Quote[];
    opportunities: Opportunity[];
    invoices: Invoice[];
    activities: Activity[];
  };
}
/**
 * Component de Client per a la pàgina de detall d'un contacte.
 * Gestiona tota la interactivitat, incloent:
 * - La visualització de dades en pestanyes.
 * - Un mode d'edició per modificar les dades del contacte.
 * - La crida a les accions per desar o eliminar el contacte.
 */
export function ContactDetailClient({ initialContact, initialRelatedData }: ContactDetailClientProps) {
  const t = useTranslations('ContactDetailPage');
  const locale = useLocale(); // ✅ Obtenim l'idioma actual
  const dateLocale = locale === 'ca' ? ca : es; // ✅ Seleccionem l'objecte de 'date-fns' correcte

  const router = useRouter();
  const [isPending, startTransition] = useTransition(); // Estat de càrrega per a les accions.
  const [isEditing, setIsEditing] = useState(false); // Booleà que controla si estem en mode vista o edició.
  const [contact, setContact] = useState(initialContact); // Estat local per a les dades del contacte.
  const formRef = React.useRef<HTMLFormElement>(null);// Referència al formulari per poder resetejar-lo.
  /**
   * Gestiona el desat dels canvis del formulari d'edició.
   * Crida la Server Action 'updateContactAction'.
   */
  const handleSaveChanges = (formData: FormData) => {
    startTransition(async () => {
      const { data, error } = await updateContactAction(contact.id, formData);
      if (error) {
        toast.error(t('toast.errorTitle'), { description: error.message });
      } else if (data) {
        toast.success(t('toast.successTitle'), { description: t('toast.updateSuccess') });
        setContact(data as Contact); // Actualitzem l'estat local amb les noves dades.
        setIsEditing(false); // Tornem al mode de visualització.
      }
    });
  };
  /**
  * Gestiona l'eliminació del contacte.
  * Crida la Server Action 'deleteContactAction'.
  */
  const handleDelete = () => {
    if (!confirm("Segur que vols eliminar aquest contacte? Aquesta acció no es pot desfer.")) {
      return;
    }
    // La confirmació es gestiona ara amb un diàleg modal. Aquesta funció es crida
    // des del botó de confirmació del diàleg.
    startTransition(async () => {
      const res = await deleteContactAction(contact.id);
      if (!res.success) {
        toast.error(t('toast.errorTitle'), { description: res.message });
      } else {
        toast.success(t('toast.successTitle'), { description: t('toast.deleteSuccess') });
        router.push('/crm/contactes'); // Redirigim a la llista de contactes.
      }
    });
  };
  /**
 * Cancel·la el mode d'edició i reseteja el formulari als seus valors originals.
 */
  const handleCancelEdit = () => {
    setIsEditing(false);
    formRef.current?.reset();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <form action={handleSaveChanges} ref={formRef}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div className="flex-1">
            <Button variant="ghost" onClick={() => router.push('/crm/contactes')} type="button" className="mb-4 -ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToContacts')}
            </Button>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                {isEditing ? <Input name="nom" defaultValue={contact.nom} className="text-3xl font-bold px-3 py-2" placeholder={t('placeholderName')} /> : <h1 className="text-4xl font-bold">{contact.nom}</h1>}
                {isEditing ? <Input name="empresa" defaultValue={contact.empresa || ''} className="text-xl px-3 py-2 mt-2" placeholder={t('placeholderCompany')} /> : <p className="text-xl text-muted-foreground mt-1">{contact.empresa}</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center self-start sm:self-end pt-4">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={handleCancelEdit} type="button"><Ban className="w-4 h-4 mr-2" />{t('buttons.cancel')}</Button>
                <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('buttons.saveChanges')}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} type="button"><Edit className="w-4 h-4 mr-2" />{t('buttons.editDetails')}</Button>
                <Dialog>
                  <DialogTrigger asChild><Button variant="destructive" type="button" className="gap-2"><Trash className="w-4 h-4" />{t('buttons.delete')}</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="space-y-4 text-center">
                      <Trash className="w-12 h-12 mx-auto text-red-600" />
                      <DialogTitle className="text-2xl font-bold text-red-600">{t('deleteDialog.title')}</DialogTitle>
                      <DialogDescription className="text-base text-muted-foreground">
                        {t('deleteDialog.description1')} <span className="font-semibold text-red-600">{t('deleteDialog.irreversible')}</span>. {t('deleteDialog.description2')}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-3">
                        <DialogTrigger asChild><Button variant="outline">{t('buttons.cancel')}</Button></DialogTrigger>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('buttons.confirmDelete')}
                        </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
        
        <div className="glass-card p-2 mt-8">
          <Tabs defaultValue="activitats" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
              <TabTriggerWithCount value="activitats" icon={ActivityIcon} count={initialRelatedData.activities.length} label={t('tabs.activities')} />
              <TabTriggerWithCount value="oportunitats" icon={Briefcase} count={initialRelatedData.opportunities.length} label={t('tabs.opportunities')} />
              <TabTriggerWithCount value="pressupostos" icon={FileText} count={initialRelatedData.quotes.length} label={t('tabs.quotes')} />
              <TabTriggerWithCount value="factures" icon={Receipt} count={initialRelatedData.invoices.length} label={t('tabs.invoices')} />
              <TabsTrigger value="detalls"><Edit className="w-4 h-4 mr-2"/>{t('tabs.details')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activitats" className="p-8">
              <h3 className="text-2xl font-bold mb-6">{t('activities.title')}</h3>
              <div className="space-y-4">{initialRelatedData.activities.length > 0 ? initialRelatedData.activities.map(act => (
                <div key={`act-${act.id}`} className="..."><div className="..."><span className="...">{act.type}</span><span>{format(new Date(act.created_at), "d MMMM yyyy, HH:mm", { locale: dateLocale })}</span></div><p className="...">"{act.content}"</p></div>
              )) : <p className="...">{t('activities.empty')}</p>}</div>
            </TabsContent>
            
            <TabsContent value="oportunitats" className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t('opportunities.title')}</h3>
                <Table><TableHeader><TableRow><TableHead>{t('opportunities.table.name')}</TableHead><TableHead>{t('opportunities.table.status')}</TableHead><TableHead className="text-right">{t('opportunities.table.value')}</TableHead></TableRow></TableHeader><TableBody>
                    {initialRelatedData.opportunities.length > 0 ? initialRelatedData.opportunities.map(opp => (
                        <TableRow key={`opp-${opp.id}`}><TableCell><Link href={`/crm/pipeline`} className="...">{opp.name}</Link></TableCell><TableCell><StatusBadge status={opp.stage_name} /></TableCell><TableCell className="text-right ...">€{(opp.value || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={3} className="...">{t('opportunities.empty')}</TableCell></TableRow>}
                </TableBody></Table>
            </TabsContent>
            
            <TabsContent value="pressupostos" className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t('quotes.title')}</h3>
                <Table><TableHeader><TableRow><TableHead>{t('quotes.table.number')}</TableHead><TableHead>{t('quotes.table.status')}</TableHead><TableHead className="text-right">{t('quotes.table.total')}</TableHead></TableRow></TableHeader><TableBody>
                    {initialRelatedData.quotes.length > 0 ? initialRelatedData.quotes.map(quote => (
                        <TableRow key={`quote-${quote.id}`}><TableCell><Link href={`/crm/quotes/${quote.id}`} className="...">{quote.quote_number}</Link></TableCell><TableCell><StatusBadge status={quote.status} /></TableCell><TableCell className="text-right ...">€{(quote.total || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={3} className="...">{t('quotes.empty')}</TableCell></TableRow>}
                </TableBody></Table>
            </TabsContent>

            <TabsContent value="factures" className="p-8">
                <h3 className="text-2xl font-bold mb-6">{t('invoices.title')}</h3>
                <Table><TableHeader><TableRow><TableHead>{t('invoices.table.number')}</TableHead><TableHead>{t('invoices.table.status')}</TableHead><TableHead className="text-right">{t('invoices.table.total')}</TableHead></TableRow></TableHeader><TableBody>
                    {initialRelatedData.invoices.length > 0 ? initialRelatedData.invoices.map(invoice => (
                        <TableRow key={`inv-${invoice.id}`}><TableCell className="...">{invoice.invoice_number}</TableCell><TableCell><StatusBadge status={invoice.status} /></TableCell><TableCell className="text-right ...">€{(invoice.total || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                    )) : <TableRow><TableCell colSpan={3} className="...">{t('invoices.empty')}</TableCell></TableRow>}
                </TableBody></Table>
            </TabsContent>
            
            <TabsContent value="detalls" className="p-8 space-y-12">
              <div>
                <h3 className="text-2xl font-bold mb-6">{t('details.generalInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                  <div className="space-y-2"><Label>{t('details.labels.email')}</Label>{isEditing ? (<Input name="email" type="email" defaultValue={contact.email || ''}/>) : (<p className="...">{contact.email || t('details.noData')}</p>)}</div>
                  <div className="space-y-2"><Label>{t('details.labels.phone')}</Label>{isEditing ? (<Input name="telefon" defaultValue={contact.telefon || ''}/>) : (<p className="...">{contact.telefon || t('details.noData')}</p>)}</div>
                  <div className="space-y-2"><Label>{t('details.labels.status')}</Label>{isEditing ? (<Select name="estat" defaultValue={contact.estat}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                    {CONTACT_STATUSES.map(status => <SelectItem key={status} value={status}>{t(`contactStatuses.${status}`)}</SelectItem>)}
                  </SelectContent></Select>) : (<p className="...">{contact.estat || t('details.noData')}</p>)}</div>
                  <div className="space-y-2"><Label>{t('details.labels.jobTitle')}</Label>{isEditing ? (<Input name="job_title" defaultValue={contact.job_title || ''}/>) : (<p className="...">{contact.job_title || t('details.noData')}</p>)}</div>
                  <div className="space-y-2"><Label>{t('details.labels.industry')}</Label>{isEditing ? (<Input name="industry" defaultValue={contact.industry || ''}/>) : (<p className="...">{contact.industry || t('details.noData')}</p>)}</div>
                  <div className="space-y-2"><Label>{t('details.labels.leadSource')}</Label>{isEditing ? (<Input name="lead_source" defaultValue={contact.lead_source || ''}/>) : (<p className="...">{contact.lead_source || t('details.noData')}</p>)}</div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">{t('details.personalInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                    <div className="space-y-2"><Label>{t('details.labels.birthday')}</Label>{isEditing ? (<Input type="date" name="birthday" defaultValue={contact.birthday || ''}/>) : (<p className="...">{contact.birthday ? format(new Date(contact.birthday), 'dd/MM/yyyy', { locale: dateLocale }) : t('details.noData')}</p>)}</div>
                    <div className="space-y-2"><Label>{t('details.labels.city')}</Label>{isEditing ? (<Input name="address.city" defaultValue={contact.address?.city || ''}/>) : (<p className="...">{contact.address?.city || t('details.noData')}</p>)}</div>
                    <div className="space-y-2"><Label>{t('details.labels.linkedin')}</Label>{isEditing ? (<Input name="social_media.linkedin" defaultValue={contact.social_media?.linkedin || ''}/>) : (<p className="...">{contact.social_media?.linkedin || t('details.noData')}</p>)}</div>
                    <div className="space-y-2"><Label>{t('details.labels.children')}</Label>{isEditing ? (<Input type="number" name="children_count" defaultValue={contact.children_count ?? ''} />) : (<p className="...">{contact.children_count ?? t('details.noData')}</p>)}</div>
                    <div className="space-y-2"><Label>{t('details.labels.partnerName')}</Label>{isEditing ? (<Input name="partner_name" defaultValue={contact.partner_name || ''} />) : (<p className="...">{contact.partner_name || t('details.noData')}</p>)}</div>
                    <div className="space-y-2"><Label>{t('details.labels.hobbies')}</Label>{isEditing ? (<Input name="hobbies" defaultValue={contact.hobbies?.join(', ') || ''} />) : (<p className="...">{contact.hobbies?.join(', ') || t('details.noData')}</p>)}</div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">{t('details.notes')}</h3>
                {isEditing ? (<Textarea name="notes" defaultValue={contact.notes || ''} rows={6}/>) : (<p className="...">{contact.notes || t('details.noNotes')}</p>)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </motion.div>
  );
}