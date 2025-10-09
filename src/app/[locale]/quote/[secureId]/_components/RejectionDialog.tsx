"use client";

import { useState } from 'react';
import { toast } from 'sonner';

// UI Components
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

interface RejectionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (reason: string) => void;
    isPending: boolean;
}

export function RejectionDialog({ isOpen, onOpenChange, onSubmit, isPending }: RejectionDialogProps) {
    const [reason, setReason] = useState("");

    const handleSubmit = () => {
        if (reason.trim() === "") {
            toast.error("Motiu requerit", { description: "Si us plau, explica breument per què rebutges el pressupost." });
            return;
        }
        onSubmit(reason);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Rebutjar el Pressupost</AlertDialogTitle>
                    <AlertDialogDescription>Per ajudar-nos a millorar, si us plau, explica'ns breument els motius de la teva decisió.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="rejectionReason" className="text-left">Motius del rebuig</Label>
                    <Textarea id="rejectionReason" placeholder="Ex: El preu és massa alt, falten funcionalitats..." className="mt-2" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel·lar</AlertDialogCancel>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Enviar i Rebutjar
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
