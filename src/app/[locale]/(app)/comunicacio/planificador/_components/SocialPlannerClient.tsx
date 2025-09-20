"use client";

import { useState, useMemo, useTransition } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createSocialPostAction, scheduleSocialPostAction, unscheduleSocialPostAction, deleteSocialPostAction } from './actions';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { PlusCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Video, Clock, Trash2, GripVertical, CheckCircle, XCircle } from 'lucide-react';

// ✅ COMPONENT 'CARD' ACTUALITZAT AMB COLORS
const PostCard = ({ post, isDragging }: { post: SocialPost; isDragging: boolean }) => {
  const statusStyles = {
    scheduled: { border: 'border-primary/50', icon: <Clock size={12} />, text: 'text-primary' },
    published: { border: 'border-green-500', icon: <CheckCircle size={12} />, text: 'text-green-600' },
    failed: { border: 'border-destructive', icon: <XCircle size={12} />, text: 'text-destructive' },
    draft: { border: 'border-border', icon: null, text: '' }
  };
  
  const style = statusStyles[post.status];

  return (
    <div className={`p-2 rounded-lg bg-card text-sm flex items-start gap-2 border ${style.border} ${isDragging ? 'shadow-2xl scale-105' : 'shadow-sm'}`}>
      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1 cursor-grab" />
      <div className="flex-grow">
        {(post.status === 'scheduled' || post.status === 'published' || post.status === 'failed') && post.scheduled_at && (
          <p className={`font-bold text-xs flex items-center gap-1 mb-1 ${style.text}`}>
            {style.icon}
            {post.status === 'scheduled' && format(parseISO(post.scheduled_at), 'HH:mm')}
            {post.status === 'published' && 'Publicat'}
            {post.status === 'failed' && 'Error'}
          </p>
        )}
        <p className="line-clamp-3 break-words">{post.content}</p>
        {post.media_url && (
          <div className="mt-2 text-muted-foreground flex items-center gap-1">
            {post.media_type === 'image' ? <ImageIcon size={14} /> : <Video size={14} />}
            <span className="text-xs">Arxiu adjunt</span>
          </div>
        )}
      </div>
    </div>
  );
};


// Component principal del planificador
export function SocialPlannerClient({ initialPosts }: { initialPosts: SocialPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [postToView, setPostToView] = useState<SocialPost | null>(null);

  const [postToSchedule, setPostToSchedule] = useState<{ post: SocialPost; date: Date } | null>(null);
  const [isPending, startTransition] = useTransition();

  const scheduledPosts = useMemo(() => posts.filter(p => p.status === 'scheduled'), [posts]);

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startingDayIndex = getDay(firstDayOfMonth) === 0 ? 6 : getDay(firstDayOfMonth) - 1;
  const unscheduledDrafts = useMemo(() => posts.filter(p => p.status === 'draft'), [posts]);
  const calendarPosts = useMemo(() => posts.filter(p => p.status !== 'draft'), [posts]);


  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const postId = parseInt(draggableId);
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (destination.droppableId.startsWith('day-')) {
      const dateStr = destination.droppableId.replace('day-', '');
      setPostToSchedule({ post, date: new Date(dateStr) });
      setScheduleModalOpen(true);
    }
    else if (destination.droppableId === 'unscheduled-drafts' && post.status === 'scheduled') {
      startTransition(async () => {
        const { success } = await unscheduleSocialPostAction(postId);
        if (success) {
          toast.success("Publicació moguda a esborranys.");
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'draft', scheduled_at: null } : p));
        } else {
          toast.error("Hi ha hagut un error.");
        }
      });
    }
  };
  
  const handleScheduleConfirm = (time: string) => {
    if (!postToSchedule) return;
    const [hours, minutes] = time.split(':').map(Number);
    // Creem la data en la zona horària local de l'usuari
     // ✅ CORRECCIÓ DE ZONA HORÀRIA: Aquesta és la manera més robusta de crear una data
    // que representi correctament l'hora local de l'usuari.
    const scheduleDate = postToSchedule.date;
    const scheduledDateTime = new Date(
      scheduleDate.getFullYear(),
      scheduleDate.getMonth(),
      scheduleDate.getDate(),
      hours,
      minutes
    );

    startTransition(async () => {
      // Enviem la data en format ISO (UTC), que és l'estàndard
      const { success } = await scheduleSocialPostAction(postToSchedule.post.id, scheduledDateTime.toISOString());
      if (success) {
        toast.success("Publicació planificada correctament!");
        setPosts(prev => prev.map(p => p.id === postToSchedule.post.id ? { ...p, status: 'scheduled', scheduled_at: scheduledDateTime.toISOString() } : p));
      } else {
        toast.error("Error en planificar la publicació.");
      }
      setScheduleModalOpen(false);
      setPostToSchedule(null);
    });
  };

  const handleCreatePost = (formData: FormData) => {
    startTransition(async () => {
      const result = await createSocialPostAction(formData);
      if (result.success && result.data) {
        toast.success("Esborrany creat correctament!");
        setPosts(prev => [result.data as SocialPost, ...prev]);
        setCreateModalOpen(false);
      } else {
        toast.error(result.message || "Hi ha hagut un error.");
      }
    });
  };
  
  const handleDeletePost = (postId: number) => {
    startTransition(async () => {
        const { success } = await deleteSocialPostAction(postId);
        if (success) {
            toast.success("Publicació eliminada.");
            setPosts(prev => prev.filter(p => p.id !== postId));
        } else {
            toast.error("No s'ha pogut eliminar la publicació.");
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
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Publicació
          </Button>
          <div className="bg-muted/50 rounded-lg p-4 flex-grow flex flex-col">
            <h2 className="font-semibold mb-3">Esborranys Pendents</h2>
            <Droppable droppableId="unscheduled-drafts">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 min-h-[200px] flex-grow overflow-y-auto pr-2">
                  {unscheduledDrafts.map((post, index) => (
                    <Draggable key={post.id} draggableId={post.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => handleViewPost(post)}>
                          <PostCard post={post} isDragging={snapshot.isDragging} />
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
            <div>Dll</div><div>Dm</div><div>Dc</div><div>Dj</div><div>Dv</div><div>Ds</div><div>Dg</div>
          </div>
          <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-grow">
            {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
            {daysInMonth.map(day => {
             // Ara busquem a 'calendarPosts' en lloc de només 'scheduledPosts'
             const postsOnThisDay = calendarPosts.filter(p => p.scheduled_at && isSameDay(parseISO(p.scheduled_at), day));
             return (
               <Droppable key={day.toString()} droppableId={`day-${day.toISOString()}`}>
                 {(provided, snapshot) => (
                   <div {...provided.droppableProps} ref={provided.innerRef} className={`rounded-md p-2 flex flex-col gap-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-muted/30'}`}>
                     <span className="font-semibold text-sm">{format(day, 'd')}</span>
                     <div className="flex-grow space-y-2">
                       {postsOnThisDay.map((post, index) => (
                         // Les publicacions ja publicades o fallides no es poden arrossegar
                         <Draggable key={post.id} draggableId={post.id.toString()} index={index} isDragDisabled={post.status !== 'scheduled'}>
                           {(provided, snapshot) => (
                             <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onDoubleClick={() => handleViewPost(post)}>
                               <PostCard post={post} isDragging={snapshot.isDragging} />
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
      
      <CreatePostDialog isOpen={isCreateModalOpen} onOpenChange={setCreateModalOpen} onCreate={handleCreatePost} isPending={isPending} />
      <SchedulePostDialog isOpen={isScheduleModalOpen} onOpenChange={setScheduleModalOpen} onConfirm={handleScheduleConfirm} isPending={isPending} />
      <ViewPostDialog isOpen={isViewModalOpen} onOpenChange={setViewModalOpen} post={postToView} />
    </DragDropContext>
  );
}

// Component separat per al diàleg de creació
// ✅ NOU: Component separat per al diàleg de creació
const CreatePostDialog = ({ isOpen, onOpenChange, onCreate, isPending }: any) => {
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setMedia(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    };
  
    const handleSubmit = () => {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('provider', 'linkedin_oidc');
      if (media) formData.append('media', media);
      onCreate(formData);
    };

    const handleClose = () => {
        onOpenChange(false);
        setContent('');
        setMedia(null);
        setPreviewUrl(null);
    };
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Crear Nova Publicació</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 p-4 flex-grow overflow-y-auto">
            {/* Formulari */}
            <div className="space-y-4 flex flex-col">
              <Textarea 
                placeholder="Què vols compartir avui?"
                className="flex-grow text-base"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <input type="file" accept="image/*,video/*" onChange={handleMediaChange} />
            </div>
            {/* Previsualització */}
            <div className="bg-muted/50 p-4 rounded-lg flex flex-col">
              <h3 className="font-semibold mb-2 text-sm flex-shrink-0">Previsualització (LinkedIn)</h3>
              <div className="border rounded-md p-3 bg-card space-y-3 flex-grow overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{content || "El teu text apareixerà aquí..."}</p>
                {previewUrl && media?.type.startsWith('image') && (
                  <img src={previewUrl} alt="Previsualització" className="rounded-md w-full object-cover" />
                )}
                {previewUrl && media?.type.startsWith('video') && (
                  <video src={previewUrl} controls className="rounded-md w-full" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="ghost" onClick={handleClose}>Cancel·lar</Button>
            <Button onClick={handleSubmit} disabled={isPending || !content}>
              {isPending ? 'Guardant...' : 'Guardar Esborrany'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
};
  
// Component separat per al diàleg de planificació
const SchedulePostDialog = ({ isOpen, onOpenChange, onConfirm, isPending }: any) => {
    const [time, setTime] = useState('10:00');
    // ✅ NOU: Detectem la zona horària del navegador per a mostrar-la a l'usuari.
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>Planificar Publicació</DialogTitle>
                    <DialogDescription>
                        Selecciona l'hora. La publicació es farà segons la teva hora local.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center p-4 gap-2">
                    <input 
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="p-2 rounded-md border bg-transparent text-2xl"
                    />
                    <p className="text-xs text-muted-foreground">(Zona horària: {userTimeZone})</p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
                    <Button onClick={() => onConfirm(time)} disabled={isPending}>
                        {isPending ? 'Planificant...' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ✅ NOU: Component per al diàleg de previsualització de la publicació
const ViewPostDialog = ({ isOpen, onOpenChange, post }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; post: SocialPost | null }) => {
  if (!post) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Previsualització de la Publicació</DialogTitle>
        </DialogHeader>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold">R</div>
            <div>
              <p className="font-semibold text-sm">Ribotflow</p>
              <p className="text-xs text-muted-foreground">Publicació a LinkedIn</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            {post.media_url && post.media_type === 'image' && (
              <img src={post.media_url} alt="Contingut multimèdia" className="rounded-md w-full object-cover max-h-[400px]" />
            )}
            {post.media_url && post.media_type === 'video' && (
              <video src={post.media_url} controls className="rounded-md w-full max-h-[400px]" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tancar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

