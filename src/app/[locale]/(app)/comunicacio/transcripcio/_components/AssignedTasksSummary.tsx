// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/AssignedTasksSummary.tsx (FITXER NOU)
'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, CheckSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type Json } from '@/types/supabase'

// Definim el tipus esperat
interface AssignedTaskSummary {
  assignee_name: string
  tasks: string[]
}

interface AssignedTasksSummaryProps {
  tasks: Json // Acceptem 'Json' des de la BD
}

// Guàrdia de tipus
function isValidTasksSummary(data: unknown): data is AssignedTaskSummary[] {
  if (!Array.isArray(data)) return false
  if (data.length === 0) return true
  const firstItem = data[0]
  return (
    typeof firstItem === 'object' &&
    firstItem !== null &&
    'assignee_name' in firstItem &&
    'tasks' in firstItem &&
    Array.isArray(firstItem.tasks)
  )
}

export function AssignedTasksSummary({ tasks }: AssignedTasksSummaryProps) {
  const t = useTranslations('Transcripcio.AssignedTasks')

  if (!isValidTasksSummary(tasks) || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default">
            <AlertDescription>{t('empty')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const tasksSummary = tasks as AssignedTaskSummary[]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {tasksSummary.map((group, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-lg">{group.assignee_name}</h3>
            </div>
            <ul className="space-y-2 pl-6">
              {group.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{task}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}