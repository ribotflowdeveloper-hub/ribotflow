"use client";

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportContactsToExcel } from '@/app/actions/exportActions'; // Adjust path if needed

export function ExportContactsButton() {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      toast.info("Iniciant l'exportació de contactes...");
      const result = await exportContactsToExcel();

      if (result.success && result.fileBuffer) {
        // This code handles the download on the client side
        const byteCharacters = atob(result.fileBuffer);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = result.fileName || 'export.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("L'exportació s'ha completat amb èxit.");
      } else {
        toast.error("Hi ha hagut un error en exportar les dades.", {
          description: result.message,
        });
      }
    });
  };

  return (
    <Button onClick={handleExport} disabled={isPending} variant="outline">
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar
    </Button>
  );
}