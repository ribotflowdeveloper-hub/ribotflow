import { useRef, useTransition } from 'react';
import { uploadAttachmentAction } from '../actions'; // La teva acció de pujada
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function AttachmentUploader({ expenseId }: { expenseId: number | string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, startTransition] = useTransition();
    const t = useTranslations('ExpenseDetail.attachments'); // O el context correcte

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input per poder pujar el mateix fitxer de nou
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append('file', file);

            // Cridem l'acció de pujada
            const result = await uploadAttachmentAction(String(expenseId), formData);

            if (result.success) {
                toast.success(result.message || t('uploadSuccess'));
                // Aquí hauries de refrescar les dades o actualitzar l'estat local
                // router.refresh(); // O una manera més optimitzada
            } else {
                toast.error(result.message || t('uploadError'));
            }
        });
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            {/* Input ocult */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploading}
            />

            {/* Àrea clicable */}
            <div 
                className="border-2 border-dashed p-4 text-center rounded-lg cursor-pointer hover:border-primary"
                onClick={triggerFileInput} // <-- Activa l'input en fer clic
            >
                {isUploading ? (
                    <p>{t('uploading')}</p> 
                ) : (
                    <p className="text-sm text-muted-foreground">{t('upload.dragAndDrop')}</p>
                )}
            </div>
            
            {/* Llista d'adjunts existents (ExpenseAttachmentCard) */}
            {/* ... */}
        </div>
    );
}