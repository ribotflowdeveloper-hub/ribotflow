"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, Trash2, X, Loader2 } from 'lucide-react';
import { type Database } from '@/types/supabase';
// ✅ Importem els components d'AlertDialog
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
// Assumeixo que DeleteConfirmationDialog JA NO és necessari si fem servir AlertDialog directament aquí.
// import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'; 

type Contact = Database['public']['Tables']['contacts']['Row'];

interface ContactDetailHeaderProps {
    contact: Contact;
    isEditing: boolean;
    isPending: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onDelete: () => void; // Aquesta és la funció que s'executarà en confirmar
}

export function ContactDetailHeader({
    contact,
    isEditing,
    isPending,
    onEdit,
    onCancel,
    onDelete, // Rep la funció onDelete
}: ContactDetailHeaderProps) {
    const router = useRouter();
    const searchParams = useSearchParams(); 
    const fromUrl = searchParams.get('from');

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
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleBackOrCancel}
                    disabled={isPending}
                    aria-label={isEditing ? "Cancel·lar edició" : "Tornar"}
                >
                    {isEditing ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{contact.nom}</h1>
                    <p className="text-sm text-muted-foreground">{contact.empresa || contact.email}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Desar
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" onClick={onEdit} disabled={isPending}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                        
                        {/* ✅ SOLUCIÓ: Utilitzem AlertDialog directament */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" disabled={isPending}>
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
                                    {/* ✅ Passem la funció 'onDelete' a l'AlertDialogAction */}
                                    <AlertDialogAction 
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={onDelete} // Aquí es crida la funció passada com a prop
                                        disabled={isPending}
                                    >
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Esborrar"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>
        </div>
    );
}