// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/DialogueFlowRenderer.tsx (FITXER COMPLET I CORREGIT)
'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Bot } from 'lucide-react'
import { type Json } from '@/types/supabase' // ✅ 1. Importem Json

// Definim el tipus esperat
interface DialogueEntry {
  speaker_name: string
  text: string
}

interface DialogueFlowRendererProps {
  flow: Json // ✅ 2. Acceptem 'Json' (que pot ser null o un array)
}

// Funció de guàrdia de tipus per validar les dades
function isValidDialogueFlow(data: unknown): data is DialogueEntry[] {
  if (!Array.isArray(data)) {
    return false
  }
  if (data.length === 0) {
    return true // Un array buit és vàlid
  }
  // Comprovem el primer element per assegurar l'estructura
  const firstItem = data[0]
  return (
    typeof firstItem === 'object' &&
    firstItem !== null &&
    'speaker_name' in firstItem &&
    'text' in firstItem
  )
}

export function DialogueFlowRenderer({ flow }: DialogueFlowRendererProps) {
  
  // ✅ 3. Validem les dades rebudes
  if (!isValidDialogueFlow(flow)) {
    return (
      <Alert variant="default">
        <AlertDescription>
          No s'ha pogut generar el diàleg pas a pas. (Dades invàlides)
        </AlertDescription>
      </Alert>
    )
  }

  // Ara sabem que 'flow' és DialogueEntry[]
  const dialogue = flow as DialogueEntry[]

  if (dialogue.length === 0) {
     return (
      <Alert variant="default">
        <AlertDescription>
          El diàleg generat està buit.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
      {dialogue.map((entry, index) => (
        <div key={index} className="flex flex-col">
          <div className="flex items-center gap-2">
            {entry.speaker_name.toLowerCase().includes('speaker') ? (
              <Bot className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <strong className="text-foreground">{entry.speaker_name}</strong>
          </div>
          <p className="mt-1 ml-6 text-muted-foreground">{entry.text}</p>
        </div>
      ))}
    </div>
  )
}