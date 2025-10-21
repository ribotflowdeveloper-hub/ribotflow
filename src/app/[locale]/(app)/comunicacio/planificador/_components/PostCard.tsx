// --- PostCard.tsx ---
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { format, parseISO } from 'date-fns';
import { Clock, CheckCircle, XCircle, Trash2, AlertTriangle, Images, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import React from 'react'; // ✅ Importem React

interface PostCardProps {
    post: SocialPost;
    isDragging: boolean;
    onDelete: (postId: number) => void;
    t: (key: string) => string;
    children?: React.ReactNode; // ✅ CORRECCIÓ: Afegim la propietat 'children'
}

export function PostCard({ post, isDragging, onDelete, t, children }: PostCardProps) {
    const statusStyles: { [key: string]: { border: string; icon: React.ReactNode | null; text: string } } = {
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
            
            {/* ✅ CORRECCIÓ: Renderitzem el 'children' que conté l'agafador */}
            {children}
            
            <div className="flex-grow overflow-hidden">
                {post.status !== 'draft' && post.scheduled_at && (
                    <p className={`font-bold flex items-center gap-1 mb-0.5 ${style.text}`}>
                        {style.icon}
                        {post.status === 'scheduled' && format(parseISO(post.scheduled_at), 'HH:mm')}
                    </p>
                )}
                <p className="truncate">{post.content || t('noContent')}</p>
            </div>

            {hasMedia && (
                <div className="relative w-10 h-10 flex-shrink-0 rounded-sm overflow-hidden bg-muted flex items-center justify-center">
                    {/* ✅ LÒGICA ACTUALITZADA PER A LA PREVISUALITZACIÓ */}
                    {post.media_type === 'image' ? (
                        <>
                            <Image src={mediaUrls[0]} alt={t('imagePreviewAlt')} fill className="object-cover" unoptimized />
                            {imageCount > 1 && (
                                <div className="absolute bottom-0.5 right-0.5 bg-black/70 ...">
                                    <Images size={10} />
                                    <span>{imageCount}</span>
                                </div>
                            )}
                        </>
                    ) : post.media_type === 'video' ? (
                        // Mostrem la icona de vídeo
                        <Video className="w-5 h-5 text-muted-foreground" />
                    ) : null}
                </div>
            )}

            {post.status === 'draft' && (
                <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
            )}
        </div>
    );
}