// Ubicació: /app/(app)/comunicacio/planificador/_components/SocialPlannerClient.tsx

"use client";

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSocialPlanner } from '../_hooks/useSocialPlanner';
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { SchedulePostDialog } from './SchedulePostDialog';
import { ViewPostDialog } from './ViewPostDialog';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { type ConnectionStatuses } from '../types';
import { cn } from '@/lib/utils/utils'; // ✅ Importem la utilitat 'cn'

interface SocialPlannerClientProps {
    initialPosts: SocialPost[];
    connectionStatuses: ConnectionStatuses;
}

export function SocialPlannerClient({ initialPosts, connectionStatuses }: SocialPlannerClientProps) {
    const t = useTranslations('Planificador');
    const {
        currentMonth, isPending, unscheduledDrafts, calendarPosts, dialogState, postToView,
        onDragEnd, handleScheduleConfirm, handleCreatePost, handleUnschedule, handleDeletePost,
        openViewDialog, openCreateDialog, setDialogState, nextMonth, prevMonth
    } = useSocialPlanner({ initialPosts });

    const firstDayOfMonth = startOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: endOfMonth(currentMonth) });
    const startingDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            {/* ✅ CORRECCIÓ 1: Canviem l'estructura principal per a un millor control */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-theme(spacing.24))] gap-6 p-4 md:p-6">

                {/* Columna d'Esborranys (Sidebar) */}
                <aside className="lg:w-[320px] xl:w-[350px] flex-shrink-0 flex flex-col gap-4 min-h-[300px] lg:min-h-0">
                    <Button onClick={openCreateDialog} className="w-full flex-shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> {t('createPost')}
                    </Button>
                    <div className="bg-muted/50 rounded-lg p-4 flex-grow flex flex-col">
                        <h2 className="font-semibold mb-3 flex-shrink-0">{t('pendingDrafts')}</h2>
                        <Droppable droppableId="unscheduled-drafts">
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={cn(
                                        "space-y-3 flex-grow overflow-y-auto pr-2 -mr-2 rounded transition-colors",
                                        snapshot.isDraggingOver && "bg-primary/10" // ✅ Feedback visual en arrossegar
                                    )}
                                >
                                    {unscheduledDrafts.map((post, index) => (
                                        <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} onDoubleClick={() => openViewDialog(post)}>
                                                    <PostCard post={post} isDragging={snapshot.isDragging} onDelete={handleDeletePost} t={t}>
                                                        <div {...provided.dragHandleProps} className="cursor-grab p-2">
                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    </PostCard>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </aside>

                {/* Calendari */}
                <section className="flex-grow bg-card p-4 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                        <h2 className="text-xl font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <header className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground mb-2 flex-shrink-0">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => <div key={day} className="capitalize">{t(`weekdays.${day}`)}</div>)}
                    </header>
                    {/* ✅ CORRECCIÓ 2: El 'grid' del calendari ara ocupa tot l'espai restant */}
                    <main className="grid grid-cols-7 grid-rows-5 gap-2 flex-grow min-h-0">
                        {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
                        {daysInMonth.map(day => {
                            const postsOnThisDay = calendarPosts.filter(p => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day));
                            return (
                                <Droppable key={day.toString()} droppableId={`day-${day.toISOString()}`}>
                                    {(provided, snapshot) => (
                                        // ✅ CORRECCIÓ 3: Millorem el feedback visual i l'àrea de drop
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={cn(
                                                'rounded-md p-1.5 flex flex-col gap-2 transition-colors',
                                                snapshot.isDraggingOver ? 'bg-primary/20' : 'bg-muted/30'
                                            )}
                                        >
                                            <span className="font-semibold text-sm text-center">{format(day, 'd')}</span>
                                            <div className="flex-grow space-y-2 overflow-y-auto pr-1">
                                                {postsOnThisDay.map((post, index) => (
                                                    <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps} onDoubleClick={() => openViewDialog(post)}>
                                                                <PostCard post={post} isDragging={snapshot.isDragging} onDelete={handleDeletePost} t={t}>
                                                                    <div {...provided.dragHandleProps} className="cursor-grab p-2">
                                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                                    </div>
                                                                </PostCard>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </main>
                </section>
            </div>

            {/* Diàlegs (es mantenen igual) */}
            <CreatePostDialog isOpen={dialogState.create} onOpenChange={(isOpen) => setDialogState(p => ({...p, create: isOpen}))} onCreate={handleCreatePost} connectionStatuses={connectionStatuses} t={t} />
            <SchedulePostDialog isOpen={dialogState.schedule} onOpenChange={(isOpen) => setDialogState(p => ({...p, schedule: isOpen}))} onConfirm={handleScheduleConfirm} isPending={isPending} />
            <ViewPostDialog isOpen={dialogState.view} onOpenChange={(isOpen) => setDialogState(p => ({...p, view: isOpen}))} post={postToView} onUnschedule={handleUnschedule} onDelete={handleDeletePost} isPending={isPending} t={t} />
        </DragDropContext>
    );
}