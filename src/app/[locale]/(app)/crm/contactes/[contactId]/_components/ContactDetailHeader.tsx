"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, Trash2, X, Loader2 } from 'lucide-react';
import { type ContactDetail } from '../actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// ✅ 1. Importem Input i useTranslations
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';

interface ContactDetailHeaderProps {
    contact: ContactDetail;
    isEditing: boolean;
    isPending: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

export function ContactDetailHeader({
    contact,
    isEditing,
    isPending,
    onEdit,
    onCancel,
    onDelete,
}: ContactDetailHeaderProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromUrl = searchParams.get('from');
    const t = useTranslations('ContactDetailPage');

    const handleBackOrCancel = () => {
        if (isEditing) {
            onCancel();
        } else if (fromUrl) {
            router.push(fromUrl);
        } else {
            router.push('/crm/contactes');
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-4 w-full">
                <Button
                    type="button" // ✅ SOLUCIÓ 1
                    variant="outline"
                    size="icon"
                    onClick={handleBackOrCancel}
                    disabled={isPending}
                    aria-label={isEditing ? "Cancel·lar edició" : "Tornar"}
                >
                    {isEditing ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                </Button>

                <div className="flex-1">
                    {isEditing ? (
                        <div>
                            <Input
                                name="nom" // Assegurem que el 'nom' sempre s'enviï
                                defaultValue={contact.nom || ''}
                                required
                                className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                                placeholder={t('details.labels.name')}
                            />
                            <p className="text-sm text-muted-foreground">
                                {contact.suppliers?.nom || contact.email}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-2xl font-bold">{contact.nom}</h1>
                            <p className="text-sm text-muted-foreground">
                                {contact.suppliers?.nom || contact.email}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Desar
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isPending}
                        >
                            Cancel·lar
                        </Button>
                    </>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onEdit}
                        disabled={isPending}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                )}

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            type="button" // ✅ SOLUCIÓ 3
                            variant="destructive"
                            size="icon"
                            disabled={isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Aquesta acció no es pot desfer. S'esborrarà permanentment el contacte
                                <span className="font-medium"> {contact.nom}</span>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Cancel·lar</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={onDelete}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Esborrar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
        </div>
    </div>
    
    );
}