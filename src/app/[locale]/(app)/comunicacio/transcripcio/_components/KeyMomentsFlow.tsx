"use client";

import React from 'react';
import type { AudioJob } from '@/types/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckSquare, MessageSquareWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

// Definim el tipus basat en el que la Edge Function retorna
type KeyMoment = {
  topic: string;
  details: string;
  decisions: string[];
  is_work_related: boolean;
}

interface KeyMomentsFlowProps {
  // Assegurem que key_moments pot ser 'any' (JSONB)
  moments: AudioJob['key_moments']; 
}

// Icona per a cada tipus de moment
const MomentIcon = ({ moment }: { moment: KeyMoment }) => {
  if (moment.decisions && moment.decisions.length > 0) {
    return <CheckSquare className="h-5 w-5 text-primary" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function KeyMomentsFlow({ moments }: KeyMomentsFlowProps) {
  const t = useTranslations('Transcripcio');
  
  // 1. Validar i filtrar les dades
  if (!moments || !Array.isArray(moments) || moments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('keyMomentsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('keyMomentsEmpty')}</p>
        </CardContent>
      </Card>
    );
  }

  // 2. Filtrem el soroll (el que no és 'is_work_related')
  const workMoments = (moments as KeyMoment[]).filter(m => m.is_work_related);

  if (workMoments.length === 0) {
     return (
      <Card>
        <CardHeader>
          <CardTitle>{t('keyMomentsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 text-muted-foreground">
          <MessageSquareWarning className="h-8 w-8" />
          <p>{t('keyMomentsNoWork')}</p>
        </CardContent>
      </Card>
    );
  }

  // 3. Renderitzem el flux (timeline)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('keyMomentsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 'relative' és clau per a la línia de la timeline */}
        <div className="relative space-y-8 pl-8">
          {/* La línia vertical de la timeline */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
          
          {workMoments.map((moment, index) => (
            <div key={index} className="relative">
              {/* El cercle de la timeline */}
              <div className="absolute -left-8 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2">
                <MomentIcon moment={moment} />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">{moment.topic}</h4>
                <p className="text-muted-foreground">{moment.details}</p>
                
                {moment.decisions && moment.decisions.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <h5 className="font-medium text-sm">{t('keyMomentsDecisions')}</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {moment.decisions.map((decision, dIndex) => (
                        <li key={dIndex} className="text-sm">{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}