import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Undo2, Trash2 } from 'lucide-react';
import Image from 'next/image';


interface ViewPostDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  post: SocialPost | null;
  onUnschedule: (postId: number) => void;
  onDelete: (postId: number) => void;
  isPending: boolean;
  t: (key: string) => string; // ✅ NOU
}

export function ViewPostDialog({ isOpen, onOpenChange, post, onUnschedule, onDelete, isPending, t }: ViewPostDialogProps) {
  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('viewPostTitle')}</DialogTitle></DialogHeader>
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">R</div>
            <div>
              <p className="font-semibold text-sm">{t('brandName')}</p>
              <p className="text-xs text-muted-foreground">{t('postToLinkedIn')}</p>
            </div>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
            {post.media_url && post.media_type === 'image' && (
              <Image
                src={post.media_url}
                alt={t('mediaContentAlt')}
                className="rounded-md w-full object-cover"

              />
            )}
            {post.media_url && post.media_type === 'video' && (
              <video src={post.media_url} controls className="rounded-md w-full" />
            )}
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row sm:justify-between w-full gap-2">
          <div className="flex gap-2">
            {post.status === 'scheduled' && (
              <Button variant="outline" onClick={() => onUnschedule(post.id)} disabled={isPending}>
                <Undo2 className="mr-2 h-4 w-4" /> {t('returnToDraft')}
              </Button>
            )}
            {post.status === 'draft' && (
              <Button variant="destructive" onClick={() => { onDelete(post.id); onOpenChange(false); }} disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" /> {t('deleteDraft')}
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)}>{t('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



