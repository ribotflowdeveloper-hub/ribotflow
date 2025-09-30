/**
 * @file src/app/[locale]/(app)/comunicacio/inbox/_components/inbox-client.tsx
 */
"use client";

import React from 'react';

import { AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTranslations } from 'next-intl';
import { type Contact } from '@/types/crm'; // Assegura't d'importar el tipus Contact
import { useInbox } from '../_hooks/useInbox'; // ✅ Importem el nostre nou hook!


import type { Ticket, Template } from '@/types/comunicacio/inbox';

// Components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TicketList } from './TicketList/index';
import { TicketDetail } from './TicketDetail';
import { ContactPanel } from './ContactPanel';
import { ComposeDialog } from './ComposeDialog';
import { MobileDetailView } from './MobileDetailView';
import type { User } from '@supabase/supabase-js'; // Importem el tipus User

// ✅ PAS 1: Definim el tipus per als membres de l'equip que rebrem.
type TeamMember = {
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
type Permission = { target_user_id: string };

// Tipamos las props del componente correctamente
export function InboxClient(props: {
  user: User;
  initialTickets: Ticket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
  initialSelectedTicket: Ticket | null;
  initialSelectedTicketBody: string | null;
  teamMembers: TeamMember[]; // ✅ Corregido
  permissions: Permission[]; // ✅ Corregido
  allTeamContacts: Contact[];
}) {
  const t = useTranslations('InboxPage');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // ✅ TOTA la lògica i estats venen d'aquí!
  const {
      selectedTicket, ticketToDelete, activeFilter, composeState, selectedTicketBody,
      isBodyLoading, hasMore, searchTerm, isPending, isContactPanelOpen, inboxFilter,
      counts, enrichedTickets,
      setTicketToDelete, setActiveFilter, setComposeState, setSearchTerm,
      setIsContactPanelOpen, setInboxFilter, handleSelectTicket, handleDeleteTicket,
      handleLoadMore, handleSaveContact, handleComposeNew, handleReply, handleRefresh,
  } = useInbox({ ...props, t });

  return (
      <>
          <ComposeDialog
              open={composeState.open}
              onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
              onEmailSent={handleRefresh} // Podem reutilitzar handleRefresh!
              initialData={composeState.initialData}
              templates={props.initialTemplates}
              contacts={props.allTeamContacts}
          />
          <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel disabled={isPending}>{t("cancelButton")}</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTicket} disabled={isPending}>{t("confirmDeleteButton")}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

          <div
              className="h-[calc(100vh-var(--header-height,64px))] w-full grid transition-all duration-300 ease-in-out"
              style={{ gridTemplateColumns: isDesktop ? `384px 1fr minmax(0, ${isContactPanelOpen ? '320px' : '0px'})` : '1fr' }}
          >
              {(!isDesktop && selectedTicket) ? null : (
                  <div className="min-h-0">
                      <TicketList
                          user={props.user}
                          teamMembers={props.teamMembers}
                          permissions={props.permissions}
                          tickets={enrichedTickets}
                          selectedTicketId={selectedTicket?.id ?? null}
                          activeFilter={activeFilter}
                          inboxFilter={inboxFilter}
                          onSetInboxFilter={setInboxFilter}
                          unreadCount={counts.unread}
                          sentCount={counts.sent}
                          totalCount={counts.received}
                          onSetFilter={setActiveFilter}
                          onDeleteTicket={setTicketToDelete}
                          onSelectTicket={handleSelectTicket}
                          onComposeNew={handleComposeNew}
                          onRefresh={handleRefresh}
                          hasMore={hasMore}
                          onLoadMore={handleLoadMore}
                          isPendingRefresh={isPending}
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                      />
                  </div>
              )}

              {isDesktop && (
                  <div className="min-h-0">
                      <TicketDetail
                          ticket={selectedTicket}
                          body={selectedTicketBody}
                          isLoading={isBodyLoading}
                          onReply={handleReply}
                          isContactPanelOpen={isContactPanelOpen}
                          onToggleContactPanel={() => setIsContactPanelOpen(prev => !prev)}
                      />
                  </div>
              )}
              
              {isDesktop && isContactPanelOpen && (
                  <div className="overflow-hidden min-h-0">
                      <ContactPanel
                          ticket={selectedTicket}
                          onSaveContact={handleSaveContact}
                          isPendingSave={isPending}
                          allTeamContacts={props.allTeamContacts}
                      />
                  </div>
              )}

              <AnimatePresence>
                  {!isDesktop && selectedTicket && (
                      <MobileDetailView
                          ticket={selectedTicket}
                          body={selectedTicketBody}
                          isLoading={isBodyLoading}
                          isPending={isPending}
                          onClose={() => handleSelectTicket(null)}
                          onReply={handleReply}
                          onSaveContact={handleSaveContact}
                      />
                  )}
              </AnimatePresence>
          </div>
      </>
  );
}