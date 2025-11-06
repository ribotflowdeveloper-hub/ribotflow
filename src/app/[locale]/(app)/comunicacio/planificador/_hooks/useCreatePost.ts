// /src/app/[locale]/(app)/comunicacio/planificador/_hooks/useCreatePost.ts (FITXER COMPLET I CORREGIT)
"use client";

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { type ConnectionStatuses } from '../types';
import { generateVideoThumbnail } from '@/lib/utils/media';
import { getPresignedUploadUrlAction, createSocialPostAction } from '../actions';
import type { SocialPost } from '@/types/db';   
import { type UsageCheckResult } from '@/lib/subscription/subscription';

interface UseCreatePostProps {
    isOpen: boolean;
    connectionStatuses: ConnectionStatuses;
    onCreate: (newPost: SocialPost) => void;
    onClose: () => void;
    t: (key: string) => string;
    postLimitStatus: UsageCheckResult; 
    accountLimitStatus: UsageCheckResult;
}

// --- Funció d'ajuda per a la validació ---
const validateImageAspectRatio = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(true); // No és una imatge, no la validem aquí
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const aspectRatio = img.width / img.height;
                // Instagram requereix entre 4:5 (0.8) i 1.91:1
                const isValid = aspectRatio >= 0.8 && aspectRatio <= 1.91;
                resolve(isValid);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};
export function useCreatePost({ 
  isOpen, connectionStatuses, onCreate, onClose, t,
  postLimitStatus, accountLimitStatus
}: UseCreatePostProps) {
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            // Filtrem els proveïdors permesos pel límit de comptes
            const allowedProviders = Object.keys(connectionStatuses)
                .filter(key => connectionStatuses[key])
                .slice(0, accountLimitStatus.max === Infinity ? undefined : accountLimitStatus.max);
            
            setSelectedProviders(allowedProviders);
        }
    }, [isOpen, connectionStatuses, accountLimitStatus.max]);

    const resetState = () => {
        setContent('');
        setMediaFiles([]);
        previewUrls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });
        setPreviewUrls([]);
        setSelectedProviders([]);
    };

    const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const isUploadingVideo = files.some(file => file.type.startsWith('video/'));
        const hasExistingMedia = mediaFiles.length > 0;
        const hasExistingVideo = hasExistingMedia && mediaFiles[0].type.startsWith('video/');

        if ((isUploadingVideo && hasExistingMedia) || (hasExistingVideo && files.length > 0)) {
            toast.error(t('errorMediaMix'), { description: t('errorMediaMixDescription') });
            return;
        }
        if (isUploadingVideo && files.length > 1) {
            toast.error(t('errorMultipleVideos'), { description: t('errorMultipleVideosDescription') });
            return;
        }

        const validFiles: File[] = [];
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const isValid = await validateImageAspectRatio(file);
                if (isValid) {
                    validFiles.push(file);
                } else {
                    toast.error(t('invalidAspectRatioTitle'), { description: t('invalidAspectRatioDescription') });
                }
            } else {
                validFiles.push(file);
            }
        }
        if (validFiles.length === 0) return;

        const newFiles = [...mediaFiles, ...validFiles].slice(0, 10);
        setMediaFiles(newFiles);

        previewUrls.forEach(url => { if (url.startsWith('blob:')) URL.revokeObjectURL(url); });

        const newPreviewPromises = newFiles.map(file => {
            if (file.type.startsWith('video/')) {
                return generateVideoThumbnail(file);
            }
            return Promise.resolve(URL.createObjectURL(file));
        });
        const newUrls = await Promise.all(newPreviewPromises);
        setPreviewUrls(newUrls);
    };

    const removeMedia = (indexToRemove: number) => {
        setMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => {
            const urlToRemove = prev[indexToRemove];
            if (urlToRemove.startsWith('blob:')) {
                URL.revokeObjectURL(urlToRemove);
            }
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };

    const handleSubmit = () => {
        
        if (!postLimitStatus.allowed) {
            toast.error(t('errorPostCreation'), { 
                description: postLimitStatus.error || "Has assolit el límit de posts." 
            });
            return; 
        }

        startTransition(async () => {
            let mediaPaths: string[] | null = null;
            let mediaType: string | null = null;

            if (mediaFiles.length > 0) {
                try {
                    const fileNames = mediaFiles.map(f => f.name);
                    // Aquesta acció ja està protegida per 'validateActionAndUsage'
                    const urlResult = await getPresignedUploadUrlAction(fileNames); 
                    if (!urlResult.success || !urlResult.data) {
                        throw new Error(urlResult.message || "Error desconegut en obtenir les URLs de pujada.");
                    }

                    await Promise.all(
                        urlResult.data.signedUrls.map((urlInfo, index) =>
                            fetch(urlInfo.signedUrl, { method: 'PUT', body: mediaFiles[index] })
                        )
                    );

                    mediaPaths = urlResult.data.signedUrls.map(info => info.path);
                    mediaType = mediaFiles[0].type.startsWith('image') ? 'image' : 'video';
                } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Error en pujar els fitxers.");
                    return;
                }
            }

            // Aquesta acció també està protegida per 'validateActionAndUsage'
            const createResult = await createSocialPostAction(content, selectedProviders, mediaPaths, mediaType);
            
            if (createResult.success && createResult.data) {
                toast.success(t('successDraftCreated'));
                onCreate(createResult.data);
            } else {
                toast.error(createResult.message || "Hi ha hagut un error en crear la publicació.");
            }
            onClose();
        });
    };

    return {
        content, setContent, mediaFiles, previewUrls, selectedProviders, isPending,
        handleMediaChange, removeMedia, setSelectedProviders, handleSubmit, resetState
    };
}