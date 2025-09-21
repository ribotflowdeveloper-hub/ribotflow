import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { getPresignedUploadUrlAction, createSocialPostAction } from './actions';
import Image from 'next/image';
import type { SocialPost } from '@/types/comunicacio/SocialPost'; 

interface ConnectionStatuses {
  linkedin_oidc: boolean;
  facebook: boolean;
  instagram: boolean;
}

interface CreatePostDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (newPost: SocialPost) => void; // ✅ Canviat de 'any' a 'SocialPost'
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  connectionStatuses: ConnectionStatuses;
  t: (key: string) => string;
}

export function CreatePostDialog({ isOpen, onOpenChange, onCreate, isPending, startTransition, connectionStatuses, t }: CreatePostDialogProps) {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // ✅ CORRECCIÓ: Aquest 'useEffect' s'executa quan s'obre el diàleg.
  // Comprova quines plataformes estan connectades i les marca per defecte.
  useEffect(() => {
    if (isOpen) {
      const defaultProviders = [];
      if (connectionStatuses.linkedin_oidc) defaultProviders.push('linkedin_oidc');
      if (connectionStatuses.facebook) defaultProviders.push('facebook');
      if (connectionStatuses.instagram) defaultProviders.push('instagram');
      setSelectedProviders(defaultProviders);
    }
  }, [isOpen, connectionStatuses]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProviderChange = (provider: string, isChecked: boolean) => {
    setSelectedProviders(prev => isChecked ? [...prev, provider] : prev.filter(p => p !== provider));
  };

  const handleSubmit = async () => {
    let mediaPath: string | null = null;
    let mediaType: string | null = null;

    if (mediaFile) {
      const urlResult = await getPresignedUploadUrlAction(mediaFile.name);
      if (!urlResult.success || !urlResult.data) {
        toast.error(urlResult.message);
        return;
      }

      const uploadResponse = await fetch(urlResult.data.signedUrl, {
        method: 'PUT',
        body: mediaFile,
        headers: { 'Content-Type': mediaFile.type },
      });

      if (!uploadResponse.ok) {
        toast.error("Error en pujar el fitxer al servidor.");
        return;
      }

      mediaPath = urlResult.data.filePath;
      mediaType = mediaFile.type.startsWith('image') ? 'image' : 'video';
    }

    const createResult = await createSocialPostAction(content, selectedProviders, mediaPath, mediaType);

    if (createResult.success && createResult.data) {
      onCreate(createResult.data);
    } else {
      toast.error(createResult.message);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setContent(''); setMediaFile(null); setSelectedProviders([]);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(open);
  };

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
            <input type="file" accept="image/*,video/*" onChange={handleMediaChange} className="text-sm" />
            <div className="space-y-2 pt-4 border-t">
              <h4 className="font-semibold text-sm">{t('publishTo')}:</h4>
              <div className="flex items-center gap-6 flex-wrap">
                {connectionStatuses.linkedin_oidc && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="linkedin"
                      checked={selectedProviders.includes('linkedin_oidc')}
                      onCheckedChange={(checked) => handleProviderChange('linkedin_oidc', !!checked)}
                    />
                    <Label htmlFor="linkedin">LinkedIn</Label>
                  </div>
                )}
                {connectionStatuses.facebook && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="facebook"
                      checked={selectedProviders.includes('facebook')}
                      onCheckedChange={(checked) => handleProviderChange('facebook', !!checked)}
                    />
                    <Label htmlFor="facebook">Facebook</Label>
                  </div>
                )}
                {connectionStatuses.instagram && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="instagram"
                      checked={selectedProviders.includes('instagram')}
                      onCheckedChange={(checked) => handleProviderChange('instagram', !!checked)}
                    />
                    <Label htmlFor="instagram">Instagram</Label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg flex flex-col">
            <h3 className="font-semibold mb-2 text-sm flex-shrink-0">{t('preview')}</h3>
            <div className="border rounded-md p-3 bg-card space-y-3 flex-grow overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{content || t('textWillAppearHere')}</p>
              {previewUrl && mediaFile?.type.startsWith('image') && (
                <div className="relative w-full aspect-video">
                  <Image
                    src={previewUrl}
                    alt={t('previewAlt')}
                    className="rounded-md object-cover"
                    fill
                    unoptimized
                  />
                </div>)}
              {previewUrl && mediaFile?.type.startsWith('video') && (
                <video src={previewUrl} controls className="rounded-md w-full" />
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="ghost" onClick={() => handleClose(false)}>{t('cancel')}</Button>
          <Button onClick={() => startTransition(handleSubmit)} disabled={isPending || !content || selectedProviders.length === 0}>
            {isPending ? t('saving') : t('saveDraft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

