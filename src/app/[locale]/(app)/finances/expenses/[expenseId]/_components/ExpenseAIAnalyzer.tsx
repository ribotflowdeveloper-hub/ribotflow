// src/app/[locale]/(app)/finances/expenses/[expenseId]/_components/ExpenseAIAnalyzer.tsx
'use client';

import { useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { analyzeInvoiceFileAction } from '../actions';
// ✅ 1. Importem el tipus de dades
import { type ExpensesAnalysisData} from '@/types/finances/expenses';

interface ExpenseAIAnalyzerProps {
  // ✅ 2. Utilitzem el tipus estricte
  onAnalysisComplete: (data: ExpensesAnalysisData) => void;
  isSaving: boolean; 
}

export function ExpenseAIAnalyzer({ onAnalysisComplete, isSaving }: ExpenseAIAnalyzerProps) {
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('ExpenseDetailPage');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    startAnalysisTransition(async () => {
      const formData = new FormData();
      formData.append('file', file);

      const result = await analyzeInvoiceFileAction(formData);

      if (result.success && result.data) {
        toast.success(t('toast.analysisSuccess') || 'Factura analitzada amb èxit.');
        // ✅ 3. 'result.data' ara és de tipus 'InvoiceAnalysisData'
        onAnalysisComplete(result.data); 
      } else {
        toast.error(result.message || t('toast.analysisError') || 'Error en analitzar el fitxer.');
      }
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isLoading = isAnalyzing || isSaving;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg"
        disabled={isLoading}
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={triggerFileInput}
        disabled={isLoading}
        className="w-full"
      >
        {isAnalyzing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4 text-blue-500" />
        )}
        {isAnalyzing ? (t('button.analyzing') || 'Analitzant...') : (t('button.analyzeAI') || 'Analitzar amb IA')}
      </Button>
    </>
  );
}