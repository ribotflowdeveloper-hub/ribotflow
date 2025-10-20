"use client";

import { type ExpenseAttachment } from '@/types/finances/expenses';
import { Button } from '@/components/ui/button';
import { Download, Trash2, FileText, Loader2 } from 'lucide-react'; // 'AlertTriangle' no s'utilitza aquí, es pot treure
import { useTransition } from 'react';
import { toast } from 'sonner';
import { getAttachmentSignedUrl, deleteAttachmentAction } from '../actions';

// ✅ CORRECCIÓ: La importació ha de ser 'alert-dialog'
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
} from "@/components/ui/alert-dialog"; // <-- Ruta corregida

interface ExpenseAttachmentCardProps {
  attachment: ExpenseAttachment;
  onDeleteSuccess: (attachmentId: string) => void; 
}

export function ExpenseAttachmentCard({ attachment, onDeleteSuccess }: ExpenseAttachmentCardProps) {
  const [isDownloading, startDownloadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  
  const handleDownload = () => {
    startDownloadTransition(async () => {
      const result = await getAttachmentSignedUrl(attachment.file_path);
      
      if (result.success && result.data?.signedUrl) {
        // Obrim la URL signada en una nova pestanya
        window.open(result.data.signedUrl, '_blank');
      } else {
        toast.error(result.message || "Error en obtenir l'enllaç de descàrrega.");
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteAttachmentAction(attachment.id, attachment.file_path);
      
      if (result.success) {
        toast.success("Adjunt eliminat correctament.");
        onDeleteSuccess(attachment.id); // Notifiquem al pare
      } else {
        toast.error(result.message || "Error eliminant l'adjunt.");
      }
    });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
      <div className="flex items-center gap-3 overflow-hidden">
        <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate" title={attachment.filename}>
            {attachment.filename}
          </span>
          <span className="text-xs text-muted-foreground">
            {attachment.mime_type}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Botó de Descàrrega (amb Server Action) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDownload}
          disabled={isDownloading}
          aria-label={`Descarregar ${attachment.filename}`}
        >
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
        
        {/* Botó d'Esborrar (amb Diàleg de Confirmació) */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              disabled={isDeleting}
              aria-label={`Esborrar ${attachment.filename}`}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
              <AlertDialogDescription>
                Aquesta acció no es pot desfer. S'esborrarà permanentment
                el fitxer <span className="font-medium">{attachment.filename}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
              {/* ✅ Assegurem que el botó d'esborrar té l'estil correcte */}
              <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Esborrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}