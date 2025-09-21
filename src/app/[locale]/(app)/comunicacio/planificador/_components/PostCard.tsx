import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { format, parseISO } from 'date-fns';
import { Clock, CheckCircle, XCircle, GripVertical, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PostCardProps {
  post: SocialPost;
  isDragging: boolean;
  onDelete: (postId: number) => void;
  t: (key: string) => string;
}

export function PostCard({ post, isDragging, onDelete, t }: PostCardProps) {
  const statusStyles = {
    scheduled: { border: 'border-primary/50', icon: <Clock size={12} />, text: 'text-primary' },
    published: { border: 'border-green-500', icon: <CheckCircle size={12} />, text: 'text-green-600' },
    failed: { border: 'border-destructive', icon: <XCircle size={12} />, text: 'text-destructive' },
    // ✅ NOU: Definim l'estil per a l'èxit parcial.
    partial_success: { border: 'border-amber-500', icon: <AlertTriangle size={12} />, text: 'text-amber-600' },
    draft: { border: 'border-border', icon: null, text: '' }
  };
  
  // Si per alguna raó l'estat no és un dels esperats, utilitzem 'draft' per a evitar errors.
  const style = statusStyles[post.status] || statusStyles.draft;

  return (
    <div className={`group relative p-1.5 rounded-md bg-card text-xs flex items-start gap-1.5 border ${style.border} ${isDragging ? 'shadow-2xl scale-105' : 'shadow-sm'}`}>
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" aria-hidden="true" />
      <div className="flex-grow overflow-hidden">
        {post.status !== 'draft' && post.scheduled_at && (
          <p className={`font-bold flex items-center gap-1 mb-0.5 ${style.text}`}>
            {style.icon}
            {post.status === 'scheduled' && format(parseISO(post.scheduled_at), 'HH:mm')}
            {post.status === 'published' && t('published')}
            {post.status === 'failed' && t('failed')}
            {post.status === 'partial_success' && t('partialSuccess')} 
          </p>
        )}
        <p className="truncate">{post.content || t('noContent')}</p>
      </div>
      {post.status === 'draft' && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(post.id);
          }}
          aria-label={t('deleteDraftAria')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

