// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/AudioJobUploader.tsx (FITXER COMPLET I CORREGIT)
'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, UploadCloud, UserPlus, X, Lock } from 'lucide-react' // ✅ 1. Importem 'Lock'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ContactSelector } from '@/components/features/contactes/ContactSelector'
import { createAudioJob } from '../../actions'
import type { Database } from '@/types/supabase'
import { type UsageCheckResult } from '@/lib/subscription/subscription' // ✅ 2. Importem el tipus de límit
import { useTranslations } from 'next-intl' // ✅ 3. Importem traduccions
import { Alert, AlertDescription, AlertTitle} from '@/components/ui'

type Contact = Database['public']['Tables']['contacts']['Row']

interface ParticipantInput {
  contact_id: number
  name: string
  role: string
}

// ✅ 4. DEFINIM LES PROPS CORRECTAMENT
interface AudioJobUploaderProps {
  contacts: Contact[]
  teamId: string
  aiActionsLimitStatus: UsageCheckResult // <-- Prop de límit afegida
}

export function AudioJobUploader({ 
  contacts, 
  teamId, 
  aiActionsLimitStatus // ✅ 5. REBEM LA PROP
}: AudioJobUploaderProps) {
  
  const [file, setFile] = useState<File | null>(null)
  const [participants, setParticipants] = useState<ParticipantInput[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const t_billing = useTranslations('Billing') // Per als missatges d'error

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentSelectedContactId, setCurrentSelectedContactId] = useState<number | null>(null)

  // ✅ 6. CALCULEM L'ESTAT DEL LÍMIT
  const isAILimitReached = !aiActionsLimitStatus.allowed;
  const isFormDisabled = isPending || isAILimitReached;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const availableContacts = useMemo(() => {
    // ... (sense canvis)
    const selectedIds = new Set(participants.map((p) => p.contact_id))
    return contacts.filter((c) => !selectedIds.has(c.id))
  }, [contacts, participants])

  const handleAddParticipant = () => {
    // ... (sense canvis)
    if (!currentSelectedContactId) return
    const contactToAdd = contacts.find((c) => c.id === currentSelectedContactId)
    if (contactToAdd) {
      setParticipants((prev) => [
        ...prev,
        {
          contact_id: contactToAdd.id,
          name: contactToAdd.nom ?? 'N/A',
          role: contactToAdd.job_title || 'Contacte',
        },
      ])
    }
    setCurrentSelectedContactId(null)
    setIsModalOpen(false)
  }

  const removeParticipant = (contactId: number) => {
    // ... (sense canvis)
    setParticipants((prev) =>
      prev.filter((p) => p.contact_id !== contactId)
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // ✅ 7. VALIDACIÓ CLIENT-SIDE (igual que a Marketing)
    if (isAILimitReached) {
      toast.error(t_billing('limitReachedTitle'), {
        description: aiActionsLimitStatus.error || t_billing('limitReachedDefault'),
      })
      return;
    }

    if (!file || participants.length === 0) {
      toast.error('Error', {
        description:
          'Necessites pujar un arxiu i seleccionar almenys un participant.',
      })
      return
    }

    startTransition(async () => {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${new Date().toISOString()}.${fileExt}`
        const filePath = `${teamId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('audio-uploads')
          .upload(filePath, file)

        if (uploadError) {
          throw new Error(`Error pujant arxiu: ${uploadError.message}`)
        }

        const result = await createAudioJob({
          storagePath: filePath,
          participants: participants,
          projectId: null,
        })

        if (result.error) {
          throw new Error(result.error) // L'error de límit del servidor es mostrarà aquí
        }

        toast.success('Èxit!', {
          description:
            "El teu àudio s'està processant. Veuràs els resultats aviat.",
        })

        // El router.push farà que es refresqui el layout i el comptador de monedes
        router.push(
          `/comunicacio/transcripcio/${result.jobId}`
        )
      } catch (error) {
        toast.error('Error en el procés', {
          description: (error as Error).message,
        })
      }
    })
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nova Transcripció d'Àudio</CardTitle>
          <CardDescription>
            Puja la gravació i assigna els participants per a l'extracció de
            tasques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ 8. ALERTA DE LÍMIT (si s'escau) */}
          {isAILimitReached && (
            <Alert variant="destructive" className="mb-4 border-yellow-400 bg-yellow-50 text-yellow-900">
              <Lock className="h-4 w-4 text-yellow-900" />
              <AlertTitle className="font-semibold">
                {t_billing('limitReachedTitle')}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {aiActionsLimitStatus.error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="audio-file">
                1. Arxiu d'Àudio (.mp3, .m4a, .wav)
              </Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={isFormDisabled} // ✅ 9. DESACTIVAT
              />
            </div>

            <div className="space-y-3">
              <Label>2. Participants de la Reunió</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-background">
                {participants.map((p) => (
                  <Badge
                    key={p.contact_id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {p.name || 'N/A'} ({p.role})
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.contact_id)}
                      className="rounded-full hover:bg-muted-foreground/20"
                      disabled={isFormDisabled} // ✅ 9. DESACTIVAT
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {/* ... (sense canvis) ... */}
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFormDisabled} // ✅ 9. DESACTIVAT
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Afegir Participant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Selecciona un Participant</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <ContactSelector
                      contacts={availableContacts}
                      selectedId={currentSelectedContactId}
                      onSelect={(id: number | null) =>
                        setCurrentSelectedContactId(id)
                      }
                      disabled={isPending} // Deixem 'isPending' aquí, ja que 'isFormDisabled' no existeix
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Cancel·lar
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      onClick={handleAddParticipant}
                      disabled={!currentSelectedContactId || isPending}
                    >
                      Afegir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Button type="submit" className="w-full" disabled={isFormDisabled}>
              {isFormDisabled ? ( // ✅ 10. ESTAT DEL BOTÓ MILLORAT
                isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {isAILimitReached ? t_billing('limitReachedTitle') : 'Pujar i Processar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}