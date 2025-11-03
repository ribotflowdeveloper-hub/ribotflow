import type { SocialPost } from '@/types/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Undo2, Trash2 } from 'lucide-react';
import { PostPreview } from './PostPreview';

interface ViewPostDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  post: SocialPost | null;
  onUnschedule: (postId: number) => void;
  onDelete: (postId: number) => void;
  isPending: boolean;
  t: (key: string) => string;
}

export function ViewPostDialog({ isOpen, onOpenChange, post, onUnschedule, onDelete, isPending, t }: ViewPostDialogProps) {
  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('viewPostTitle')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <PostPreview post={post} t={t} />
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
