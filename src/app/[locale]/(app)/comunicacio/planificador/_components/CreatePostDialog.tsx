// Ubicació: /app/(app)/comunicacio/planificador/_components/CreatePostDialog.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { Link, Loader2, Trash2 } from 'lucide-react';

import { useCreatePost } from '../_hooks/useCreatePost';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { type ConnectionStatuses } from '../types'; // ✅ Importem el tipus centralitzat

interface CreatePostDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onCreate: (newPost: SocialPost) => void;
    connectionStatuses: ConnectionStatuses;
    t: (key: string) => string;
}

export function CreatePostDialog({ isOpen, onOpenChange, onCreate, connectionStatuses, t }: CreatePostDialogProps) {
  const {
      content, setContent, previewUrls, selectedProviders, isPending,
      handleMediaChange, removeMedia, setSelectedProviders, handleSubmit, resetState
  } = useCreatePost({ 
      isOpen, 
      connectionStatuses,
      onCreate, 
      onClose: () => onOpenChange(false),
      t
  });

  const handleClose = (open: boolean) => {
      if (!open) {
          resetState();
      }
      onOpenChange(open);
  };
  const hasAnyConnection = Object.values(connectionStatuses).some(status => status === true);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl h-[90vh] md:h-[80vh] flex flex-col">
                <DialogHeader><DialogTitle>{t('createDialogTitle')}</DialogTitle></DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 p-1 md:p-4 flex-grow overflow-y-auto">
                    <div className="space-y-4 flex flex-col">
                        <Textarea
                            placeholder={t('whatsOnYourMind')}
                            className="flex-grow text-base min-h-[200px]"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <input type="file" multiple accept="image/*,video/*" onChange={handleMediaChange} className="text-sm" />
                        <div className="space-y-2 pt-4 border-t">
                            <h4 className="font-semibold text-sm">{t('publishTo')}:</h4>
                             {!hasAnyConnection ? (
                                <p className="text-sm text-muted-foreground italic">
                                    {t('noConnectionsMessage')} <Link href="/settings/integrations" className="underline text-primary hover:text-primary/80"> {t('connectHere')}</Link>.
                                </p>
                            ) : (
                                <div className="flex items-center gap-6 flex-wrap">
                                    {Object.entries(connectionStatuses).map(([key, isConnected]) => isConnected && (
                                        <div key={key} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={key}
                                                checked={selectedProviders.includes(key)}
                                                onCheckedChange={(checked) => setSelectedProviders(prev => checked ? [...prev, key] : prev.filter(p => p !== key))}
                                            />
                                            <Label htmlFor={key} className="capitalize">{key}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg flex flex-col">
                        <h3 className="font-semibold mb-2 text-sm flex-shrink-0">{t('preview')}</h3>
                        <div className="border rounded-md p-3 bg-card space-y-3 flex-grow overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap">{content || t('textWillAppearHere')}</p>
                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                                    {previewUrls.map((url, index) => (
                                        <div key={url} className="relative group aspect-square">
                                            <Image src={url} alt={`Preview ${index + 1}`} className="rounded-md object-cover" fill unoptimized />
                                            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeMedia(index)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-shrink-0 mt-4">
                    <Button variant="ghost" onClick={() => handleClose(false)}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} disabled={isPending || !content || selectedProviders.length === 0}>
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isPending ? t('saving') : t('saveDraft')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

