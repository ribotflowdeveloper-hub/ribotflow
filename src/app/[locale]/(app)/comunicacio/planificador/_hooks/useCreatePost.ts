// Ubicació: /app/(app)/comunicacio/planificador/_hooks/useCreatePost.ts

"use client";

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { getPresignedUploadUrlAction, createSocialPostAction } from '../_components/actions';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import { type ConnectionStatuses } from '../types';

interface UseCreatePostProps {
    isOpen: boolean;
    connectionStatuses: ConnectionStatuses;
    onCreate: (newPost: SocialPost) => void;
    onClose: () => void;
    t: (key: string) => string;
}

export function useCreatePost({ isOpen, connectionStatuses, onCreate, onClose, t }: UseCreatePostProps) {
    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            const defaultProviders = Object.keys(connectionStatuses).filter(key => connectionStatuses[key]);
            setSelectedProviders(defaultProviders);
        }
    }, [isOpen, connectionStatuses]);
    
    const resetState = () => {
        setContent('');
        setMediaFiles([]);
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        setSelectedProviders([]);
    };

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newFiles = [...mediaFiles, ...files].slice(0, 10);
        setMediaFiles(newFiles);
        
        const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(oldUrls => {
            oldUrls.forEach(url => URL.revokeObjectURL(url));
            return newPreviewUrls;
        });
    };

    const removeMedia = (indexToRemove: number) => {
        setMediaFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => {
            const urlToRemove = prev[indexToRemove];
            URL.revokeObjectURL(urlToRemove);
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };
    
    const handleSubmit = () => {
        startTransition(async () => {
            let mediaPaths: string[] | null = null;
            let mediaType: string | null = null;

            if (mediaFiles.length > 0) {
                try {
                    const fileNames = mediaFiles.map(f => f.name);
                    const urlResult = await getPresignedUploadUrlAction(fileNames);
                    // ✅ CORRECCIÓ: Proporcionem un missatge per defecte si 'urlResult.message' és undefined
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

            const createResult = await createSocialPostAction(content, selectedProviders, mediaPaths, mediaType);
            if (createResult.success && createResult.data) {
                toast.success(t('successDraftCreated'));
                onCreate(createResult.data);
            } else {
                // ✅ CORRECCIÓ: Proporcionem un missatge per defecte aquí també
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