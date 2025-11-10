// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/KeyMomentsFlow.tsx (FITXER COMPLET I CORREGIT)
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Check, List, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type Json } from '@/types/supabase'

// ✅ 1. INTERFÍCIE ACTUALITZADA
// Hem marcat 'decisions', 'action_items' i 'participants_involved' com a opcionals (amb '?')
// per reflectir la realitat de les dades que rebem.
interface KeyMoment {
  topic: string
  summary: string
  decisions?: string[]
  action_items?: string[]
  participants_involved?: string[]
}

interface KeyMomentsFlowProps {
  moments: Json
}

// ✅ 2. GUÀRDIA DE TIPUS ACTUALITZADA
// Hem relaxat la validació. Ara només exigim que 'topic' i 'summary' existeixin.
// Ja no comprovem l'existència de 'decisions', 'action_items', o 'participants_involved',
// ja que el nostre JSX (amb '?.') ja els gestiona de forma segura si no hi són.
function isValidKeyMoments(data: unknown): data is KeyMoment[] {
  if (!Array.isArray(data)) {
    return false
  }

  return data.every(item => {
    return (
      typeof item === 'object' &&
      item !== null &&
      'topic' in item && // Requerit
      'summary' in item // Requerit
      // Ja no cal comprovar 'decisions', 'action_items', 'participants_involved' aquí
    )
  })
}

export function KeyMomentsFlow({ moments }: KeyMomentsFlowProps) {
  const t = useTranslations('Transcripcio.KeyMoments')

  // 3. Validem les dades amb la nova funció
  if (!isValidKeyMoments(moments)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('invalidData')}</p>
        </CardContent>
      </Card>
    )
  }

  // Aquest 'as' és segur gràcies a la validació
  const keyMoments = moments as KeyMoment[]

  if (keyMoments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
          {keyMoments.map((moment, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="font-semibold text-left">
                {moment.topic}
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>{moment.summary}</p>

                {/* ✅ AQUEST CODI JA ESTÀ PREPARAT i no cal canviar-lo */}
                {/* Gràcies a '?.' (Optional Chaining) i '??' (Nullish Coalescing), */}
                {/* no hi haurà error si 'moment.decisions' és 'undefined'. */}
                {(moment.decisions?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 text-green-500" />
                      {t('decisions')}
                    </h4>
                    <ul className="list-disc pl-6">
                      {(moment.decisions ?? []).map((decision, i) => (
                        <li key={i}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ✅ AQUEST CODI JA ESTÀ PREPARAT */}
                {(moment.action_items?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium">
                      <List className="h-4 w-4 text-blue-500" />
                      {t('actions')}
                    </h4>
                    <ul className="list-disc pl-6">
                      {moment.action_items?.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ✅ AQUEST CODI JA ESTÀ PREPARAT */}
                {(moment.participants_involved?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {t('participants')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {(moment.participants_involved ?? []).join(', ')}
                    </p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}