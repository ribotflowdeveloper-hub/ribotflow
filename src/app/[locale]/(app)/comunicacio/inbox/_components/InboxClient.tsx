// /src/app/[locale]/(app)/comunicacio/inbox/_components/InboxClient.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React, { useEffect, useRef, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
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

import { prepareNetworkContactAction } from '../actions';
import { toast } from 'sonner';

interface InboxClientProps {
  user: User;
  initialTickets: EnrichedTicket[];
  initialTemplates: Template[];
  initialReceivedCount: number;
  initialSentCount: number;
  teamMembers: TeamMemberWithProfile[];
  permissions: InboxPermission[];
  allTeamContacts: Contact[];
  ticketLimitStatus: UsageCheckResult; // ✅ Prop de límit de Tiquets
  contactLimitStatus: UsageCheckResult; // ✅ Prop de límit de Contactes
}

export function InboxClient(props: InboxClientProps) {
  const t = useTranslations('InboxPage.toast');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const searchParams = useSearchParams();
  const [isPreparingNetworkMessage, startPreparingTransition] = useTransition();
  const networkContactProcessed = useRef(false);

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

  // Efecte per llegir la URL
  useEffect(() => {
    if (networkContactProcessed.current) return;

    const recipientTeamId = searchParams.get('to');
    const projectId = searchParams.get('projectId');

    if (recipientTeamId && projectId) {
      networkContactProcessed.current = true;
      startPreparingTransition(async () => {
        // Comprovem AMBDÓS límits
        if (!props.ticketLimitStatus.allowed) {
          toast.error(t('limitErrorTitle', { default: "Límit de tiquets assolit" }), {
            description: props.ticketLimitStatus.error || t('limitErrorDescription', { default: "No pots crear més tiquets." })
          });
          return;
        }
        if (!props.contactLimitStatus.allowed) {
          toast.error(t('limitErrorTitle', { default: "Límit de contactes assolit" }), {
            description: props.contactLimitStatus.error || t('limitErrorDescription_contact', { default: "No pots crear més contactes." })
          });
          return;
        }

        const toastId = toast.loading(t('preparingMessage', { default: "Preparant missatge..." }));
        const result = await prepareNetworkContactAction(recipientTeamId, projectId);
        if (result.success) {
          toast.success(t('messageReady', { default: "Missatge a punt!" }), { id: toastId });
          setComposeState({ open: true, initialData: result.data ?? null });
        } else {
          toast.error(t('errorPreparingMessage', { default: "Error preparant el missatge" }), {
            id: toastId,
            description: result.message
          });
        }
      });
    } else {
      networkContactProcessed.current = true;
    }
  }, [searchParams, setComposeState, t, props.ticketLimitStatus, props.contactLimitStatus]);


  return (
    <>
      <ComposeDialog
        open={composeState.open}
        onOpenChange={(isOpen) => setComposeState({ ...composeState, open: isOpen })}
        onEmailSent={handleRefresh}
        initialData={composeState.initialData}
        templates={props.initialTemplates}
        contacts={props.allTeamContacts}
        limitStatus={props.ticketLimitStatus} // ✅ Passa el límit de Tiquets
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
          <div className="min-h-0 flex flex-col h-full overflow-hidden">
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
              isPendingRefresh={isPending || isPreparingNetworkMessage}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isSelectionMode={isSelectionMode}
              selectedTicketIds={selectedTicketIds}
              onToggleSelection={onToggleSelection}
              onToggleSelectionMode={onToggleSelectionMode}
              onDeleteSelected={onDeleteSelected}
              limitStatus={props.ticketLimitStatus} // ✅ Passa el límit de Tiquets
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
              limitStatus={props.ticketLimitStatus} // ✅ Passa el límit de Tiquets
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
              limitStatus={props.contactLimitStatus} // ✅ Passa el límit de Contactes
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
              ticketLimitStatus={props.ticketLimitStatus}   // ✅ Passa el límit de Tiquets
              contactLimitStatus={props.contactLimitStatus} // ✅ Passa el límit de Contactes
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}