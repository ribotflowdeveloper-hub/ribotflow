// src/app/[locale]/(app)/comunicacio/inbox/_components/InboxClient.tsx
"use client";

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTranslations } from 'next-intl';
import { useInbox } from '../_hooks/useInbox';
import type { User } from '@supabase/supabase-js';
import type { Contact, EnrichedTicket, InboxPermission, TeamMemberWithProfile, Template } from '@/types/db';

// Components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TicketList } from './ticketList/index';
import { TicketDetail } from './TicketDetail';
import { ContactPanel } from './ContactPanel';
import { ComposeDialog } from './ComposeDialog';
import { MobileDetailView } from './MobileDetailView';
import { type UsageCheckResult } from '@/lib/subscription/subscription';


// ✅ Props simplificades. Ja no necessitem `initialSelectedTicket` ni `initialSelectedTicketBody`.
interface InboxClientProps {
  user: User;
  initialTickets: EnrichedTicket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
  teamMembers: TeamMemberWithProfile[];
  permissions: InboxPermission[];
  allTeamContacts: Contact[];
  limitStatus: UsageCheckResult; // ✅ 3. Afegim la nova prop

}

export function InboxClient(props: InboxClientProps) {
  const t = useTranslations('InboxPage');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const {
    selectedTicket, ticketToDelete, activeFilter, composeState, selectedTicketBody,
    isBodyLoading, hasMore, searchTerm, isPending, isContactPanelOpen, inboxFilter,
    counts, enrichedTickets,
    setTicketToDelete, setActiveFilter, setComposeState, setSearchTerm,
    setIsContactPanelOpen, setInboxFilter, handleSelectTicket, handleDeleteTicket,
    handleLoadMore, handleSaveContact, handleComposeNew, handleReply, handleRefresh, isSelectionMode,
    selectedTicketIds,
    onToggleSelectionMode,
    onToggleSelection,
    onDeleteSelected
  } = useInbox({
    ...props,
    initialUnreadCount: props.initialReceivedCount,
    t
  });

  return (
    <>
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
        onEmailSent={handleRefresh}
        initialData={composeState.initialData}
        templates={props.initialTemplates}
        contacts={props.allTeamContacts}
      />
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t("cancelButton")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} disabled={isPending}>{t("confirmDeleteButton")}</AlertDialogAction>
          </AlertDialogFooter>
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
              onSelectTicket={handleSelectTicket}
              onComposeNew={handleComposeNew}
              onRefresh={handleRefresh}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              isPendingRefresh={isPending}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              // ❌ 'onDeleteTicket' s'elimina
              
              // ✅ 2. Passem les noves props a TicketList
              isSelectionMode={isSelectionMode}
              selectedTicketIds={selectedTicketIds}
              onToggleSelection={onToggleSelection}
              onToggleSelectionMode={onToggleSelectionMode}
              onDeleteSelected={onDeleteSelected}
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
              limitStatus={props.limitStatus} // ✅ 3. Passem l'estat del límit
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