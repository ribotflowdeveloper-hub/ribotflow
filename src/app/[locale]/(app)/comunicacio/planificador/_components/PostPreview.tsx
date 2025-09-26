"use client";

import { useState } from 'react';
import type { SocialPost } from '@/types/comunicacio/SocialPost';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { FaLinkedin, FaFacebook, FaInstagram } from 'react-icons/fa';

// Funció per a obtenir la icona del proveïdor
const ProviderIcon = ({ provider }: { provider: string }) => {
    switch (provider) {
        case 'linkedin': return <FaLinkedin className="w-4 h-4 text-[#0A66C2]" />;
        case 'facebook': return <FaFacebook className="w-4 h-4 text-[#1877F2]" />;
        case 'instagram': return <FaInstagram className="w-4 h-4 text-[#E4405F]" />;
        default: return null;
    }
};

export function PostPreview({ post }: { post: Partial<SocialPost> }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const mediaUrls = Array.isArray(post.media_url) ? post.media_url : [];
    const hasMedia = mediaUrls.length > 0;
    const mediaType = post.media_type;

    const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % mediaUrls.length);
    const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + mediaUrls.length) % mediaUrls.length);

    return (
        <div className="border rounded-lg bg-card text-card-foreground shadow-sm w-full">
            {/* Capçalera del Post */}
            <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>R</AvatarFallback> {/* Pots posar les inicials de l'empresa */}
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">La Teva Pàgina</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Publicant a:</span>
                            {(post.provider || []).map(p => <ProviderIcon key={p} provider={p} />)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Contingut del Post */}
            <div className="p-4 space-y-4">
                <p className="text-sm whitespace-pre-wrap">{post.content || "El teu text apareixerà aquí..."}</p>
                
                {hasMedia && (
                    <div className="relative w-full aspect-square overflow-hidden rounded-md">
                        {mediaUrls.map((url, index) => (
                            <div key={index} className="absolute w-full h-full transition-opacity duration-300" style={{ opacity: index === currentImageIndex ? 1 : 0 }}>
                                {mediaType === 'image' ? (
                                    <Image src={url} alt={`Preview ${index + 1}`} layout="fill" className="object-cover" unoptimized/>
                                ) : (
                                    <video src={url} controls className="w-full h-full object-cover" />
                                )}
                            </div>
                        ))}
                        {mediaUrls.length > 1 && (
                            <>
                                <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" onClick={prevImage}><ChevronLeft className="h-4 w-4" /></Button>
                                <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" onClick={nextImage}><ChevronRight className="h-4 w-4" /></Button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {mediaUrls.map((_, index) => (
                                        <div key={index} className={`h-2 w-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Peu del Post (Interaccions) */}
            <div className="p-2 border-t flex justify-around text-muted-foreground">
                <Button variant="ghost" size="sm" className="w-full flex items-center gap-2"><ThumbsUp className="w-4 h-4"/> M'agrada</Button>
                <Button variant="ghost" size="sm" className="w-full flex items-center gap-2"><MessageCircle className="w-4 h-4"/> Comentar</Button>
                <Button variant="ghost" size="sm" className="w-full flex items-center gap-2"><Share2 className="w-4 h-4"/> Compartir</Button>
            </div>
        </div>
    );
}