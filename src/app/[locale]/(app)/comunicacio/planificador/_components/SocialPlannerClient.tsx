// Ubicació: /app/(app)/comunicacio/planificador/_components/SocialPlannerClient.tsx
"use client";

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSocialPlanner } from '../_hooks/useSocialPlanner';
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { SchedulePostDialog } from './SchedulePostDialog';
import { ViewPostDialog } from './ViewPostDialog';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { type ConnectionStatuses } from '../types'; // ✅ Importem el tipus centralitzat


interface SocialPlannerClientProps {
    initialPosts: SocialPost[];
    connectionStatuses: ConnectionStatuses;
}

export function SocialPlannerClient({ initialPosts, connectionStatuses }: SocialPlannerClientProps) {
    const t = useTranslations('SocialPlanner');
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
            <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col lg:flex-row gap-8 p-4 md:p-6">
                
                <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4">
                    <Button onClick={openCreateDialog} className="w-full flex-shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> {t('createPost')}
                    </Button>
                    <div className="bg-muted/50 rounded-lg p-4 flex-grow flex flex-col min-h-[300px] lg:min-h-0">
                        <h2 className="font-semibold mb-3 flex-shrink-0">{t('pendingDrafts')}</h2>
                        <Droppable droppableId="unscheduled-drafts">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 flex-grow overflow-y-auto pr-2">
                                    {unscheduledDrafts.map((post, index) => (
                                        <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => openViewDialog(post)}>
                                                    <PostCard post={post} isDragging={snapshot.isDragging} onDelete={handleDeletePost} t={t} />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>

                <div className="lg:w-2/3 xl:w-3/4 bg-card p-4 rounded-lg shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                        <h2 className="text-xl font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
                        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground mb-2 flex-shrink-0">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => <div key={day} className="capitalize">{t(`weekdays.${day}`)}</div>)}
                    </div>
                    <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-grow">
                        {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
                        {daysInMonth.map(day => {
                            const postsOnThisDay = calendarPosts.filter(p => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day));
                            return (
                                <Droppable key={day.toString()} droppableId={`day-${day.toISOString()}`}>
                                    {(provided, snapshot) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className={`rounded-md p-1.5 flex flex-col gap-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-muted/30'}`}>
                                            <span className="font-semibold text-sm text-center">{format(day, 'd')}</span>
                                            <div className="flex-grow space-y-2">
                                                {postsOnThisDay.map((post, index) => (
                                                    <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => openViewDialog(post)}>
                                                                <PostCard post={post} isDragging={snapshot.isDragging} onDelete={handleDeletePost} t={t} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                            </div>
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </div>
                </div>
            </div>

            <CreatePostDialog isOpen={dialogState.create} onOpenChange={(isOpen) => setDialogState(p => ({...p, create: isOpen}))} onCreate={handleCreatePost} connectionStatuses={connectionStatuses} t={t} />
            <SchedulePostDialog isOpen={dialogState.schedule} onOpenChange={(isOpen) => setDialogState(p => ({...p, schedule: isOpen}))} onConfirm={handleScheduleConfirm} isPending={isPending} />
            <ViewPostDialog isOpen={dialogState.view} onOpenChange={(isOpen) => setDialogState(p => ({...p, view: isOpen}))} post={postToView} onUnschedule={handleUnschedule} onDelete={handleDeletePost} isPending={isPending} t={t} />
        </DragDropContext>
    );
}