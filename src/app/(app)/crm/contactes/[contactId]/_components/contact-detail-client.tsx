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
import { ca } from 'date-fns/locale';
import { deleteContactAction, updateContactAction } from './actions';
import { type Contact, type Quote, type Opportunity, type Invoice, type Activity } from '@/types/crm'; // Use central types
import { Trash } from "lucide-react";
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
 */const StatusBadge: FC<{ status?: string | null }> = ({ status }) => {
    let colorClass = 'bg-muted text-muted-foreground';
    
    // ✅ CORRECTION: Initialize text with a safe default
    let text = status || 'N/A';
    
    // Use a temporary variable for the switch to avoid type issues
    const lowerCaseStatus = status?.toLowerCase();

    switch (lowerCaseStatus) {
        case 'draft': text = 'Esborrany'; colorClass = 'bg-yellow-500/10 text-yellow-500'; break;
        case 'sent': text = 'Enviat'; colorClass = 'bg-blue-500/10 text-blue-500'; break;
        case 'accepted': case 'guanyat': case 'paid': text = 'Guanyat/Pagat'; colorClass = 'bg-green-500/10 text-green-500'; break;
        case 'declined': case 'perdut': text = 'Rebutjat'; colorClass = 'bg-red-500/10 text-red-500'; break;
        case 'negociació': text = 'Negociació'; colorClass = 'bg-purple-500/10 text-purple-500'; break;
        case 'overdue': text = 'Vençut'; colorClass = 'bg-orange-500/10 text-orange-500'; break;
    }
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
        toast.error('Error',{ description: error.message} );
      } else if (data) {
        toast.success('Èxit!',{description: 'Contacte actualitzat.'}  );
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
        toast.error('Error', {description: res.message });
      } else {
        toast.success('Èxit!', {description: 'El contacte ha estat eliminat correctament.' });
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
                    <ArrowLeft className="w-4 h-4 mr-2" /> Tornar a Contactes
                </Button>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-10 h-10 text-white" />
                    </div>
                    <div>
                    {isEditing ? (
  <Input
    name="nom"
    defaultValue={contact.nom}
    className="text-3xl font-bold px-3 py-2"
    placeholder="Escriu el nom del contacte"
  />
) : (
  <h1 className="text-4xl font-bold">{contact.nom}</h1>
)}

{isEditing ? (
  <Input
    name="empresa"
    defaultValue={contact.empresa || ''}
    className="text-xl px-3 py-2 mt-2"
    placeholder="Escriu el nom de l’empresa"
  />
) : (
  <p className="text-xl text-muted-foreground mt-1">{contact.empresa}</p>
)}
                    </div>
                </div>
            </div>
            <div className="flex gap-2 items-center self-start sm:self-end pt-4">
  {isEditing ? (
    <>
      <Button variant="ghost" onClick={handleCancelEdit} type="button"><Ban className="w-4 h-4 mr-2" />Cancel·lar</Button>
      <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Desar Canvis</Button>
    </>
  ) : (
    <>
      <Button variant="outline" onClick={() => setIsEditing(true)} type="button"><Edit className="w-4 h-4 mr-2" />Editar Detalls</Button>
      <Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive" type="button" className="gap-2">
      <Trash className="w-4 h-4" />
      Eliminar
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader className="space-y-4 text-center">
      <Trash className="w-12 h-12 mx-auto text-red-600" />
      <DialogTitle className="text-2xl font-bold text-red-600">
        Eliminar contacte?
      </DialogTitle>
      <DialogDescription className="text-base text-muted-foreground">
        Aquesta acció <span className="font-semibold text-red-600">no es pot desfer</span>.  
        Es perdrà tota la informació relacionada amb aquest contacte, incloent activitats, pressupostos i factures.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="flex justify-end gap-3">
      <Button variant="outline">Cancel·lar</Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sí, eliminar definitivament
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </>
  )}
</div>
        </div>
        
        <div className="glass-card p-2">
            <Tabs defaultValue="activitats" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                    <TabTriggerWithCount value="activitats" icon={ActivityIcon} count={initialRelatedData.activities.length} label="Activitats" />
                    <TabTriggerWithCount value="oportunitats" icon={Briefcase} count={initialRelatedData.opportunities.length} label="Oportunitats" />
                    <TabTriggerWithCount value="pressupostos" icon={FileText} count={initialRelatedData.quotes.length} label="Pressupostos" />
                    <TabTriggerWithCount value="factures" icon={Receipt} count={initialRelatedData.invoices.length} label="Factures" />
                    <TabsTrigger value="detalls"><Edit className="w-4 h-4 mr-2"/>Detalls</TabsTrigger>
                </TabsList>
                
                <TabsContent value="activitats" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">Historial d'Activitats</h3>
                    <div className="space-y-4">{initialRelatedData.activities.length > 0 ? initialRelatedData.activities.map(act => (
                        <div key={`act-${act.id}`} className="p-4 rounded-lg border bg-muted/30"><div className="flex justify-between text-sm text-muted-foreground"><span className="font-bold text-white">{act.type}</span><span className="flex-shrink-0">{format(new Date(act.created_at), "d MMMM yyyy, HH:mm", { locale: ca })}</span></div><p className="mt-2 text-base italic">"{act.content}"</p></div>
                    )) : <p className="text-base text-muted-foreground text-center py-8">No hi ha activitats per a aquest contacte.</p>}</div>
                </TabsContent>
                
                <TabsContent value="oportunitats" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">Oportunitats</h3>
                    <Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Estat</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>
                        {initialRelatedData.opportunities.length > 0 ? initialRelatedData.opportunities.map(opp => (
                            <TableRow key={`opp-${opp.id}`}><TableCell><Link href={`/crm/pipeline`} className="font-medium hover:underline">{opp.name}</Link></TableCell><TableCell><StatusBadge status={opp.stage_name} /></TableCell><TableCell className="text-right font-semibold">€{(opp.value || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No hi ha oportunitats.</TableCell></TableRow>}
                    </TableBody></Table>
                </TabsContent>

                <TabsContent value="pressupostos" className="p-8">
                     <h3 className="text-2xl font-bold mb-6">Pressupostos</h3>
                    <Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Estat</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
                        {initialRelatedData.quotes.length > 0 ? initialRelatedData.quotes.map(quote => (
                            <TableRow key={`quote-${quote.id}`}><TableCell><Link href={`/crm/quotes/${quote.id}`} className="font-medium hover:underline">{quote.quote_number}</Link></TableCell><TableCell><StatusBadge status={quote.status} /></TableCell><TableCell className="text-right font-semibold">€{(quote.total || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No hi ha pressupostos.</TableCell></TableRow>}
                    </TableBody></Table>
                </TabsContent>

                <TabsContent value="factures" className="p-8">
                    <h3 className="text-2xl font-bold mb-6">Factures</h3>
                    <Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Estat</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>
                        {initialRelatedData.invoices.length > 0 ? initialRelatedData.invoices.map(invoice => (
                           <TableRow key={`inv-${invoice.id}`}><TableCell className="font-medium">{invoice.invoice_number}</TableCell><TableCell><StatusBadge status={invoice.status} /></TableCell><TableCell className="text-right font-semibold">€{(invoice.total || 0).toLocaleString('ca-ES')}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No hi ha factures.</TableCell></TableRow>}
                    </TableBody></Table>
                </TabsContent>
                
                <TabsContent value="detalls" className="p-8 space-y-12">
                    <div>
                        <h3 className="text-2xl font-bold mb-6">Informació General</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                            <div className="space-y-2"><Label>Email</Label>{isEditing ? (<Input name="email" type="email" defaultValue={contact.email || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.email || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Telèfon</Label>{isEditing ? (<Input name="telefon" defaultValue={contact.telefon || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.telefon || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Estat</Label>{isEditing ? (<Select name="estat" defaultValue={contact.estat}><SelectTrigger className="text-lg h-auto p-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lead">Lead</SelectItem><SelectItem value="Actiu">Actiu</SelectItem><SelectItem value="Client">Client</SelectItem></SelectContent></Select>) : (<p className="text-lg pt-2">{contact.estat || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Càrrec</Label>{isEditing ? (<Input name="job_title" defaultValue={contact.job_title || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.job_title || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Sector</Label>{isEditing ? (<Input name="industry" defaultValue={contact.industry || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.industry || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Origen del Lead</Label>{isEditing ? (<Input name="lead_source" defaultValue={contact.lead_source || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.lead_source || '--'}</p>)}</div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-6">Informació Personal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
                            <div className="space-y-2"><Label>Aniversari</Label>{isEditing ? (<Input type="date" name="birthday" defaultValue={contact.birthday || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.birthday ? format(new Date(contact.birthday), 'dd/MM/yyyy', { locale: ca }) : '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Ciutat</Label>{isEditing ? (<Input name="address.city" defaultValue={contact.address?.city || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.address?.city || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>LinkedIn</Label>{isEditing ? (<Input name="social_media.linkedin" defaultValue={contact.social_media?.linkedin || ''} className="text-lg p-2"/>) : (<p className="text-lg pt-2">{contact.social_media?.linkedin || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Fills</Label>{isEditing ? (<Input type="number" name="children_count" defaultValue={contact.children_count ?? ''} />) : (<p className="text-lg pt-2">{contact.children_count ?? '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Nom de la parella</Label>{isEditing ? (<Input name="partner_name" defaultValue={contact.partner_name || ''} />) : (<p className="text-lg pt-2">{contact.partner_name || '--'}</p>)}</div>
                            <div className="space-y-2"><Label>Hobbies</Label>{isEditing ? (<Input name="hobbies" defaultValue={contact.hobbies?.join(', ') || ''} />) : (<p className="text-lg pt-2">{contact.hobbies?.join(', ') || '--'}</p>)}</div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-6">Notes</h3>
                        {isEditing ? (<Textarea name="notes" defaultValue={contact.notes || ''} rows={6} className="text-lg"/>) : (<p className="text-base text-muted-foreground whitespace-pre-wrap">{contact.notes || 'No hi ha notes per a aquest contacte.'}</p>)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </form>
    </motion.div>
    
  );
  
}