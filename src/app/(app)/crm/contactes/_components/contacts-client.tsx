"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner"; // ✅ Canviem la importació
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, LayoutGrid, List } from 'lucide-react';
import { type Contact } from '@/types/crm'; // ✅ CORRECT
import { CONTACT_STATUS_DISPLAY } from '@/types/crm'; // ✅ 1. Importa la constant!

import ContactCard from '@/components/contactes/ContactCard';
import ContactTable from '@/components/contactes/ContactTable';
import { createContactAction } from './actions';


/**
 * Component principal i interactiu per a la pàgina de llista de contactes.
 * Gestiona l'estat de la cerca, el mode de visualització (targetes o llista)
 * i el diàleg per crear nous contactes.
 */
export function ContactsClient({ initialContacts }: { initialContacts: Contact[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [contacts, setContacts] = useState<Contact[]>(initialContacts);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    
    // Funció per navegar a la pàgina de detall d'un contacte.
    const handleContactClick = (contact: Contact) => {
        router.push(`/crm/contactes/${contact.id}`);
    };
    // 'useMemo' optimitza el filtratge de contactes. Només es torna a executar
    // si la llista de 'contacts' o el 'searchTerm' canvien.
    const filteredContacts = useMemo(() => contacts.filter(c => 
        (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (c.empresa?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    ), [contacts, searchTerm]);
      /**
     * Gestiona l'enviament del formulari de nou contacte.
     * Crida la Server Action 'createContactAction' i gestiona la resposta.
     */
    const handleSaveContact = (formData: FormData) => {
        startTransition(async () => {
            const result = await createContactAction(formData);
            if (result.error) {
                toast.error('Error', { description: result.error.message  });
            } else if (result.data) {
                toast.success('Èxit!',{description: 'El contacte s\'ha desat correctament.'}  );
                setContacts(prev => [result.data as Contact, ...prev]);
                setIsDialogOpen(false);
            }
        });
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 flex-shrink-0">
                <h1 className="text-3xl font-bold">Contactes</h1>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Cerca..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                        <Button variant={viewMode === 'cards' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('cards')}><LayoutGrid className="w-4 h-4" /></Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nou Contacte</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nou Contacte</DialogTitle>
                                <DialogDescription>Afegeix els detalls del nou contacte.</DialogDescription>
                            </DialogHeader>
                            <form action={handleSaveContact} className="space-y-4 pt-4">
                                <Input name="nom" placeholder="Nom complet" required />
                                <Input name="empresa" placeholder="Empresa" />
                                <Input name="email" type="email" placeholder="Email" required />
                                <Input name="telefon" placeholder="Telèfon" />
                                <Input name="valor" type="number" placeholder="Valor (€)" defaultValue={0} />
                                  {/* 👇 AQUÍ VE EL CANVI 👇 */}
                                <Select name="estat" defaultValue="Lead">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CONTACT_STATUS_DISPLAY).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Desar Contacte
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                <AnimatePresence mode="wait">
                    <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {filteredContacts.length > 0 ? (
                            viewMode === 'cards' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                    {filteredContacts.map(contact => (
                                        <ContactCard key={contact.id} contact={contact} onClick={() => handleContactClick(contact)} />
                                    ))}
                                </div>
                            ) : ( <ContactTable contacts={filteredContacts} onRowClick={handleContactClick} /> )
                        ) : ( <div className="text-center py-16"><p>No s'han trobat contactes.</p></div> )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};