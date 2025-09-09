// Ruta del fitxer: src/app/(app)/comunicacio/inbox/_components/InboxClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Loader2, Inbox, User, Building, RefreshCw, Trash2, ArrowLeft, Info, PenSquare, Reply, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { Ticket, Template, Contact } from '../page';
import { deleteTicketAction, markTicketAsReadAction, saveSenderAsContactAction } from '../actions';
import { ComposeDialog } from './ComposeDialog';


const formatTicketDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (date >= startOfToday) {
        return date.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
    }
};

export function InboxClient({ initialTickets, initialTemplates }: {
    initialTickets: Ticket[];
    initialTemplates: Template[];
}) {
    const { toast } = useToast();
    const router = useRouter();
    const [tickets, setTickets] = useState(initialTickets);
    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [activeFilter, setActiveFilter] = useState('rebuts');
    const [composeState, setComposeState] = useState<{ open: boolean, initialData: any }>({ open: false, initialData: null });
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const currentSelectedTicketStillExists = selectedTicket && tickets.some(t => t.id === selectedTicket.id);
        
        if (isDesktop) {
            if (!currentSelectedTicketStillExists && tickets.length > 0) {
                setSelectedTicket(tickets[0]);
            } else if (tickets.length === 0) {
                setSelectedTicket(null);
            }
        } else {
            setSelectedTicket(null);
        }
    }, [isDesktop, tickets]);
    
    const handleSelectTicket = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        if (ticket.status === 'Obert') {
            setTickets(currentTickets => currentTickets.map(t => t.id === ticket.id ? { ...t, status: 'Llegit' } : t));
            startTransition(() => {
                markTicketAsReadAction(ticket.id);
            });
        }
    };

    const handleDeleteTicket = () => {
        if (!ticketToDelete) return;
        startTransition(async () => {
            const result = await deleteTicketAction(ticketToDelete.id);
            if (result.success) {
                toast({ title: 'Èxit!', description: result.message });
                setTicketToDelete(null);
                router.refresh(); 
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleSaveContact = (ticket: Ticket) => {
        startTransition(async () => {
            const result = await saveSenderAsContactAction(ticket);
             if (result.success) {
                toast({ title: 'Èxit!', description: result.message });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const handleComposeNew = () => setComposeState({ open: true, initialData: null });

    const handleReply = (ticket: Ticket) => {
        if (!ticket) return;
        const quotedBody = `<br><br><br><p>--- El ${new Date(ticket.sent_at).toLocaleString('ca-ES')} ${ticket.contacts?.nom || ticket.sender_name || ''} va escriure ---</p><blockquote>${ticket.body}</blockquote>`;
        setComposeState({ open: true, initialData: { contactId: ticket.contact_id, to: ticket.contacts?.email || ticket.sender_email, subject: ticket.subject.toLowerCase().startsWith('re:') ? ticket.subject : `Re: ${ticket.subject}`, body: quotedBody } });
    };

    const handleRefresh = () => {
        startTransition(() => {
            router.refresh();
            toast({ title: 'Safata actualitzada' });
        });
    };

    const counts = useMemo(() => {
        const received = tickets.filter(t => t.type === 'rebut' || !t.type);
        const sent = tickets.filter(t => t.type === 'enviat');
        const unread = received.filter(t => t.status === 'Obert').length;
        return { all: tickets.length, received: received.length, sent: sent.length, unread };
    }, [tickets]);

    const filteredTickets = useMemo(() => tickets.filter(ticket => {
        if (activeFilter === 'tots') return true;
        if (activeFilter === 'rebuts') return ticket.type === 'rebut' || !ticket.type;
        if (activeFilter === 'enviats') return ticket.type === 'enviat';
        return true;
    }), [tickets, activeFilter]);


    const TicketList = ({ tickets: ticketList }: { tickets: Ticket[]}) => (
        <div className="flex-1 overflow-y-auto">
            {ticketList.length > 0 ? ticketList.map(ticket => (
                <div key={ticket.id} onClick={() => handleSelectTicket(ticket)} className={`group p-4 cursor-pointer border-l-4 relative ${selectedTicket?.id === ticket.id ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <p className={`truncate font-semibold ${ticket.status !== 'Obert' ? 'font-normal text-muted-foreground' : ''}`}>{ticket.contacts?.nom || ticket.sender_name || 'Desconegut'}</p>
                        <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                             {ticket.status === 'Obert' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                            <span className="text-muted-foreground">{formatTicketDate(ticket.sent_at)}</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground truncate mt-1">{ticket.preview}</p>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setTicketToDelete(ticket); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
            )) : <div className="flex flex-col items-center justify-center h-full p-4 text-center"><Inbox className="w-12 h-12 text-muted-foreground mb-2" /><p className="text-muted-foreground">La teva safata està buida.</p></div>}
        </div>
    );

    const DesktopLayout = () => (
        <div className="flex flex-row h-full w-full">
            <div className="w-80 lg:w-96 flex flex-col flex-shrink-0 border-r border-border glass-card">
                <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <h1 className="text-xl font-bold">Safata d'Entrada</h1>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleComposeNew}><PenSquare className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}><RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} /></Button>
                    </div>
                </div>
                {/* ✅ DISSENY RESTAURAT: Afegim el botó de 'Enviats' amb el seu comptador */}
                <div className="p-2 flex gap-2 border-b border-border flex-shrink-0">
                    <Button variant={activeFilter === 'rebuts' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFilter('rebuts')}>Rebuts <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${counts.unread > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>{counts.unread}</span></Button>
                    <Button variant={activeFilter === 'enviats' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFilter('enviats')}>Enviats <span className="ml-2 text-xs text-muted-foreground">{counts.sent}</span></Button>
                </div>
                <TicketList tickets={filteredTickets} />
            </div>
            <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
                {selectedTicket ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                            <h2 className="text-2xl font-bold truncate">{selectedTicket.subject}</h2>
                            <Button variant="outline" onClick={() => handleReply(selectedTicket)}><Reply className="mr-2 h-4 w-4" />Respondre</Button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto">
                            <div className="prose-email max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTicket.body) }} />
                        </div>
                    </>
                ) : <div className="flex-1 flex flex-col items-center justify-center text-center p-4"><Inbox className="w-16 h-16 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold">Selecciona una conversa</h2><p className="text-muted-foreground">Tria un email de la llista per veure'l aquí.</p></div>}
            </div>
            {/* ✅ LÒGICA RESTAURADA: Mostrem els detalls complets del contacte */}
            <div className="w-80 lg:w-96 flex-col flex-shrink-0 border-l border-border glass-card hidden lg:flex">
                {selectedTicket?.contacts ? (
                     <>
                        <div className="p-4 border-b"><h2 className="text-xl font-bold">Detalls del Contacte</h2></div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                           <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"><User className="w-8 h-8 text-primary" /></div>
                                <div><h3 className="text-lg font-semibold">{selectedTicket.contacts.nom}</h3><p className="text-sm text-muted-foreground flex items-center gap-1"><Building className="w-4 h-4" />{selectedTicket.contacts.empresa}</p></div>
                            </div>
                           <p><strong>Email:</strong> {selectedTicket.contacts.email}</p>
                           <p><strong>Telèfon:</strong> {selectedTicket.contacts.telefon || 'No especificat'}</p>
                           <p><strong>Ubicació:</strong> {selectedTicket.contacts.ubicacio || 'No especificada'}</p>
                        </div>
                    </>
                ) : selectedTicket ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <User className="w-16 h-16 text-muted-foreground mb-4" />
                        <p className="font-semibold">{selectedTicket.sender_name}</p>
                        <p className="text-sm text-muted-foreground mb-4">{selectedTicket.sender_email}</p>
                        <Button onClick={() => handleSaveContact(selectedTicket)} disabled={isPending}><UserPlus className="w-4 h-4 mr-2"/>Guardar Contacte</Button>
                    </div>
                ) : <div className="flex-1 flex flex-col items-center justify-center text-center p-4"><User className="w-16 h-16 text-muted-foreground mb-4" /><p className="text-muted-foreground">Cap contacte associat.</p></div>}
            </div>
        </div>
    );

    const MobileAndTabletLayout = () => (
        <div className="flex h-full w-full overflow-hidden relative">
            <div className={`w-full flex-col flex-shrink-0 ${selectedTicket ? 'hidden' : 'flex'}`}>
                <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
                    <h1 className="text-xl font-bold">Safata d'Entrada</h1>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={handleComposeNew}><PenSquare className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isPending}><RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} /></Button>
                    </div>
                </div>
                <div className="p-2 flex gap-2 border-b border-border flex-shrink-0">
                     <Button variant={activeFilter === 'rebuts' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFilter('rebuts')}>Rebuts <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${counts.unread > 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted'}`}>{counts.unread}</span></Button>
                    <Button variant={activeFilter === 'enviats' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFilter('enviats')}>Enviats <span className="ml-2 text-xs text-muted-foreground">{counts.sent}</span></Button>
                </div>
                <TicketList tickets={filteredTickets} />
            </div>
             <AnimatePresence>
                {selectedTicket && (
                    <motion.div key={selectedTicket.id} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.3 }} className="absolute inset-0 flex flex-col bg-background z-10">
                        <div className="p-2 border-b border-border flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center min-w-0">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)} className="flex-shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
                                <div className="ml-2 truncate"><p className="font-semibold truncate">{selectedTicket.subject}</p><p className="text-sm text-muted-foreground truncate">{selectedTicket.contacts?.nom || selectedTicket.sender_name}</p></div>
                            </div>
                            <Button size="sm" variant="outline" className="mr-2 flex-shrink-0" onClick={() => handleReply(selectedTicket)}><Reply className="mr-2 h-4 w-4" />Respondre</Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
                            <details className="border rounded-lg p-3 mb-4 bg-muted/50">
                                <summary className="cursor-pointer font-semibold flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Detalls del Remitent</summary>
                                <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                                    <p><strong>Nom:</strong> {selectedTicket.contacts?.nom || selectedTicket.sender_name}</p>
                                    <p><strong>Email:</strong> {selectedTicket.contacts?.email || selectedTicket.sender_email}</p>
                                    {!selectedTicket.contacts && <Button size="sm" className="w-full mt-2" onClick={() => handleSaveContact(selectedTicket)} disabled={isPending}><UserPlus className="w-4 h-4 mr-2"/>Guardar Contacte</Button>}
                                </div>
                            </details>
                            <div className="prose-email max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTicket.body) }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="h-full w-full">
            <ComposeDialog 
                open={composeState.open}
                onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
                onEmailSent={() => router.refresh()}
                initialData={composeState.initialData}
                templates={templates}
            />
            <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Estàs segur?</AlertDialogTitle><AlertDialogDescription>Aquesta acció no es pot desfer.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isPending}>Sí, elimina'l</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="h-full w-full">{isDesktop ? <DesktopLayout /> : <MobileAndTabletLayout />}</div>
        </div>
    );
};

