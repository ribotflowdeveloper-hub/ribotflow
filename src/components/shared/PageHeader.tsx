"use client"; // Aquest component té interacció (botó de tornar)

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  children?: React.ReactNode; // Per a botons d'acció I AVISOS
  // ❗ Eliminem 'isLimitExceeded'. El pare decidirà què renderitzar.
}

export function PageHeader({ 
  title, 
  description, 
  showBackButton = false, 
  children 
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Tornar</span>
          </Button>
        )}
        
        <div className="grid gap-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* ✅ Aquest contenidor ara és 'flex' per alinear l'avís i el botó */}
      {children && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}