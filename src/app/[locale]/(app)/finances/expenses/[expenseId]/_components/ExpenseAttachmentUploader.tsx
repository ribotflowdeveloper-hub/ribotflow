"use client";

// ✅ 'useState' ja no és necessari si no guardem els fitxers a l'estat
import { useTransition } from 'react'; 
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud } from 'lucide-react'; // 'X' no s'utilitzava
// import { Button } from '@/components/ui/button'; // 'Button' no s'utilitzava (estava al codi comentat)
import { toast } from 'sonner';
import { uploadAttachmentAction } from '../actions';
import { type ExpenseAttachment } from '@/types/finances/expenses';

interface ExpenseAttachmentUploaderProps {
  expenseId: number; // L'ID de la despesa (ha d'existir)
  onUploadSuccess: (newAttachment: ExpenseAttachment) => void;
}

export function ExpenseAttachmentUploader({
  expenseId,
  onUploadSuccess,
}: ExpenseAttachmentUploaderProps) {
  // ✅ Eliminem l'estat 'files', ja que no el llegim enlloc.
  // const [files, setFiles] = useState<File[]>([]);
  const [isUploading, startUploadTransition] = useTransition();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // ✅ Quan s'accepten fitxers (que ja serà de tipus 'File[]' després d'instal·lar),
    // els passem directament a la funció de pujada.
    onDrop: (acceptedFiles: File[]) => { // Podem tipar-ho explícitament o deixar que ho infereixi
      // setFiles(acceptedFiles); // <-- Eliminat
      handleUpload(acceptedFiles);
    },
    multiple: true,
  });

  const handleUpload = (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) {
      toast.error("Selecciona almenys un fitxer.");
      return;
    }

    startUploadTransition(async () => {
      let successCount = 0;

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadAttachmentAction(expenseId, formData);

        if (result.success && result.data?.newAttachment) {
          onUploadSuccess(result.data.newAttachment); // Notifica al pare
          successCount++;
        } else {
          toast.error(`Error pujant ${file.name}: ${result.message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} fitxer(s) pujats correctament.`);
      }
      // ✅ Eliminem la neteja de l'estat, ja que no existeix.
      // if (errorCount === 0) {
      //   setFiles([]); 
      // }
    });
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-6 text-center rounded-lg cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Pujant fitxers...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Deixa anar els fitxers aquí"
                : "Arrossega fitxers aquí, o fes clic per seleccionar"}
            </p>
          </div>
        )}
      </div>

      {/* Si en el futur vols activar aquesta vista prèvia, 
        hauràs de tornar a afegir el 'useState<File[]>' 
        i el 'setFiles(acceptedFiles)' al 'onDrop'. 
        En fer-ho, l'error 'ts(6133)' desapareixerà sol.
      */}
      {/* {files.length > 0 && !isUploading && (
         <div className="space-y-2">
           {files.map(file => (
             <div key={file.name} className="...">...</div>
           ))}
           <Button onClick={() => handleUpload(files)} disabled={isUploading}>
             {isUploading ? 'Pujant...' : `Pujar ${files.length} fitxer(s)`}
           </Button>
         </div>
       )}
      */}
    </div>
  );
}