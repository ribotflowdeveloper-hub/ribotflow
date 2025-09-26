import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { format, parseISO } from 'date-fns';
import { Clock, CheckCircle, XCircle, GripVertical, Trash2, AlertTriangle, Images, Video } from 'lucide-react'; // ✅ 1. Importem la icona 'Video'
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface PostCardProps {
    post: SocialPost;
    isDragging: boolean;
    onDelete: (postId: number) => void;
    t: (key: string) => string;
}

export function PostCard({ post, isDragging, onDelete, t }: PostCardProps) {
    const statusStyles: { [key: string]: { border: string; icon: JSX.Element | null; text: string } } = {
        scheduled: { border: 'border-primary/50', icon: <Clock size={12} />, text: 'text-primary' },
        published: { border: 'border-green-500', icon: <CheckCircle size={12} />, text: 'text-green-600' },
        failed: { border: 'border-destructive', icon: <XCircle size={12} />, text: 'text-destructive' },
        partial_success: { border: 'border-amber-500', icon: <AlertTriangle size={12} />, text: 'text-amber-600' },
        draft: { border: 'border-border', icon: null, text: '' }
    };

    const style = statusStyles[post.status] || statusStyles.draft;
    
    const mediaUrls = post.media_url || [];
    const hasMedia = mediaUrls.length > 0;
    const imageCount = mediaUrls.length;

    return (
        <div className={`group relative p-1.5 rounded-md bg-card text-xs flex items-start gap-1.5 border ${style.border} ${isDragging ? 'shadow-2xl scale-105' : 'shadow-sm'}`}>
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" aria-hidden="true" />
            
            <div className="flex-grow overflow-hidden">
                {post.status !== 'draft' && post.scheduled_at && (
                    <p className={`font-bold flex items-center gap-1 mb-0.5 ${style.text}`}>
                        {style.icon}
                        {post.status === 'scheduled' && format(parseISO(post.scheduled_at), 'HH:mm')}
                        {/* ... la resta dels estats ... */}
                    </p>
                )}
                <p className="truncate">{post.content || t('noContent')}</p>
            </div>

            {/* ✅ 2. NOVA LÒGICA DE PREVISUALITZACIÓ */}
            {hasMedia && (
                <div className="relative w-10 h-10 flex-shrink-0 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                    {post.media_type === 'image' ? (
                        <>
                            <Image
                                src={mediaUrls[0]}
                                alt={t('imagePreviewAlt')}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                            {imageCount > 1 && (
                                <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white px-1 py-0.5 text-[10px] rounded-sm flex items-center gap-0.5">
                                    <Images size={10} />
                                    <span>{imageCount}</span>
                                </div>
                            )}
                        </>
                    ) : post.media_type === 'video' ? (
                        // Si és un vídeo, mostrem una icona
                        <Video className="w-5 h-5 text-muted-foreground" />
                    ) : null}
                </div>
            )}

            {post.status === 'draft' && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 ..." onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            )}
        </div>
    );
}