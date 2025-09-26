"use client";

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { getPresignedUploadUrlAction, createSocialPostAction } from './actions';
import Image from 'next/image';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { Loader2, Trash2 } from 'lucide-react'; // Importem icones necessàries

interface ConnectionStatuses {
  linkedin: boolean;
  facebook: boolean;
  instagram: boolean;
}

interface CreatePostDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreate: (newPost: SocialPost) => void;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  connectionStatuses: ConnectionStatuses;
  t: (key: string) => string;
}

export function CreatePostDialog({ isOpen, onOpenChange, onCreate, connectionStatuses, t }: CreatePostDialogProps) {
  const [content, setContent] = useState('');
  // ✅ Ara l'estat desa un array de fitxers i de URLs de previsualització
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      const defaultProviders = [];
      if (connectionStatuses.linkedin) defaultProviders.push('linkedin');
      if (connectionStatuses.facebook) defaultProviders.push('facebook');
      if (connectionStatuses.instagram) defaultProviders.push('instagram');
      setSelectedProviders(defaultProviders);
    }
  }, [isOpen, connectionStatuses]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Limitem a 10 imatges per a Instagram, per exemple
      const newFiles = [...mediaFiles, ...files].slice(0, 10);
      setMediaFiles(newFiles);

      // Netegem les URLs antigues per a evitar problemes de memòria
      previewUrls.forEach(url => URL.revokeObjectURL(url));

      // Creem noves URLs de previsualització
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const removeMedia = (indexToRemove: number) => {
    setMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setPreviewUrls(prev => {
      const urlToRemove = prev[indexToRemove];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handleProviderChange = (provider: string, isChecked: boolean) => {
    setSelectedProviders(prev => isChecked ? [...prev, provider] : prev.filter(p => p !== provider));
  };


  const handleSubmit = () => {
    // ✅ 2. Embolcalla TOTA la lògica asíncrona dins de 'startTransition'
    startTransition(async () => {
      let mediaPaths: string[] | null = null;
      let mediaType: string | null = null;

      if (mediaFiles.length > 0) {
        try {
          const fileNames = mediaFiles.map(f => f.name);
          const urlResult = await getPresignedUploadUrlAction(fileNames);
          if (!urlResult.success || !urlResult.data) throw new Error(urlResult.message);

          await Promise.all(
            urlResult.data.signedUrls.map((urlInfo, index) =>
              fetch(urlInfo.signedUrl, { method: 'PUT', body: mediaFiles[index] })
            )
          );

          mediaPaths = urlResult.data.signedUrls.map(info => info.path);
          mediaType = mediaFiles[0].type.startsWith('image') ? 'image' : 'video';
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Error en pujar els fitxers.");
          return; // Aturem l'execució si la pujada falla
        }
      }

      const createResult = await createSocialPostAction(content, selectedProviders, mediaPaths, mediaType);
      if (createResult.success && createResult.data) {
        toast.success(t('successDraftCreated'));
        onCreate(createResult.data);
      } else {
        toast.error(createResult.message);
      }
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setContent('');
      setMediaFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setSelectedProviders([]);
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
                {/* ✅ CORRECCIÓ: Comprovem 'connectionStatuses.linkedin' */}
                {connectionStatuses.linkedin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="linkedin"
                      // ✅ CORRECCIÓ: El valor és 'linkedin'
                      checked={selectedProviders.includes('linkedin')}
                      onCheckedChange={(checked) => handleProviderChange('linkedin', !!checked)}
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

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <Image src={url} alt={`Preview ${index + 1}`} className="rounded-md object-cover" fill unoptimized />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeMedia(index)}>
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
          {/* ✅ 3. Utilitza 'isPending' per a donar feedback a l'usuari */}
          <Button onClick={handleSubmit} disabled={isPending || !content || selectedProviders.length === 0}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isPending ? t('saving') : t('saveDraft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

