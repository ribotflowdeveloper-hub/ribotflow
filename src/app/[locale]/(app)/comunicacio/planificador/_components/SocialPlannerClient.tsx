"use client";

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { scheduleSocialPostAction, unscheduleSocialPostAction, deleteSocialPostAction } from './actions';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Importem els components fills
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { SchedulePostDialog } from './SchedulePostDialog';
import { ViewPostDialog } from './ViewPostDialog';

// Definim el tipus per a l'estat de les connexions
interface ConnectionStatuses {
  linkedin: boolean;
  facebook: boolean;
  instagram: boolean;
}

// Definim les propietats que el component principal espera rebre del servidor
interface SocialPlannerClientProps {
  initialPosts: SocialPost[];
  connectionStatuses: ConnectionStatuses;
}

export function SocialPlannerClient({ initialPosts, connectionStatuses }: SocialPlannerClientProps) {
  const t = useTranslations('SocialPlanner');
  const [posts, setPosts] = useState(initialPosts);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [postToView, setPostToView] = useState<SocialPost | null>(null);

  const [postToSchedule, setPostToSchedule] = useState<{ post: SocialPost; date: Date } | null>(null);
  const [isPending, startTransition] = useTransition();

  const unscheduledDrafts = useMemo(() => posts.filter(p => p.status === 'draft'), [posts]);
  const calendarPosts = useMemo(() => posts.filter(p => p.status !== 'draft'), [posts]);

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startingDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1;

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const postId = parseInt(draggableId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (destination.droppableId.startsWith('day-')) {
      const dateStr = destination.droppableId.replace('day-', '');
      setPostToSchedule({ post, date: new Date(dateStr) });
      setScheduleModalOpen(true);
    } else if (destination.droppableId === 'unscheduled-drafts' && post.status === 'scheduled') {
      handleUnschedule(post.id);
    }
  };

  const handleScheduleConfirm = (time: string) => {
    if (!postToSchedule) return;
    const [hours, minutes] = time.split(':').map(Number);

    const scheduledDateTime = new Date(
      postToSchedule.date.getFullYear(), postToSchedule.date.getMonth(), postToSchedule.date.getDate(),
      hours, minutes
    );

    startTransition(async () => {
      const { success, message } = await scheduleSocialPostAction(postToSchedule.post.id, scheduledDateTime.toISOString());
      if (success) {
        toast.success(message);
        setPosts(prev => prev.map(p => p.id === postToSchedule.post.id ? { ...p, status: 'scheduled', scheduled_at: scheduledDateTime.toISOString() } : p));
      } else {
        toast.error(message);
      }
      setScheduleModalOpen(false);
      setPostToSchedule(null);
    });
  };

  const handleCreatePost = (newPost: SocialPost) => {
    // Aquesta funció només actualitza l'estat del client.
    // La lògica de la BD i la pujada ja s'han fet dins del diàleg.
    setPosts(prev => [newPost, ...prev]);
    setCreateModalOpen(false);
  };

  const handleUnschedule = (postId: number) => {
    startTransition(async () => {
      const result = await unscheduleSocialPostAction(postId);
      if (result.success) {
        toast.success(result.message);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'draft', scheduled_at: null } : p));
        setViewModalOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDeletePost = (postId: number) => {
    startTransition(async () => {
      const result = await deleteSocialPostAction(postId);
      if (result.success) {
        toast.success(result.message);
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleViewPost = (post: SocialPost) => {
    setPostToView(post);
    setViewModalOpen(true);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col lg:flex-row gap-8 p-4 md:p-6">
        <div className="lg:w-1/3 xl:w-1/4 flex flex-col gap-4">
          <Button onClick={() => setCreateModalOpen(true)} className="w-full flex-shrink-0">
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
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => handleViewPost(post)}>
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
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground mb-2 flex-shrink-0">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => <div key={day}>{t(`weekdays.${day}`)}</div>)}
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
                          <Draggable key={post.id} draggableId={post.id.toString()} index={index} isDragDisabled={post.status !== 'scheduled'}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => handleViewPost(post)}>
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

      <CreatePostDialog
        isOpen={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreate={handleCreatePost}
        isPending={isPending}
        startTransition={startTransition}
        connectionStatuses={connectionStatuses}
        t={t}
      />
      {/* ✅ Eliminem la propietat t={t} d'aquí */}
      <SchedulePostDialog
        isOpen={isScheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onConfirm={handleScheduleConfirm}
        isPending={isPending}
      />      <ViewPostDialog isOpen={isViewModalOpen} onOpenChange={setViewModalOpen} post={postToView} onUnschedule={handleUnschedule} onDelete={handleDeletePost} isPending={isPending} t={t} />
    </DragDropContext>
  );
}