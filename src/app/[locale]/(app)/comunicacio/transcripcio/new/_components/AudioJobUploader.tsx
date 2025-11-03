'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, UploadCloud, UserPlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ContactSelector } from '@/components/features/contactes/ContactSelector'
import { createAudioJob } from '../../actions'
import type { Database } from '@/types/supabase' // ✅ Importem Database

// ✨ CORRECCIÓ: Fem servir el tipus real de la BD
type Contact = Database['public']['Tables']['contacts']['Row']

// Aquest tipus el fem servir internament per a la llista de participants
interface ParticipantInput {
  contact_id: number
  name: string // El 'nom' del contacte
  role: string // El 'job_title' o rol
}

// ✅ La prop 'contacts' ara és del tipus correcte
export function AudioJobUploader({ contacts, teamId }: { contacts: Contact[], teamId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [participants, setParticipants] = useState<ParticipantInput[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentSelectedContactId, setCurrentSelectedContactId] = useState<
    number | null
  >(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  // Filtrem els contactes que ja han estat afegits
  const availableContacts = useMemo(() => {
    const selectedIds = new Set(participants.map((p) => p.contact_id))
    return contacts.filter((c) => !selectedIds.has(c.id))
  }, [contacts, participants])

  // Funció per afegir el contacte seleccionat al Dialog
  const handleAddParticipant = () => {
    if (!currentSelectedContactId) return

    const contactToAdd = contacts.find((c) => c.id === currentSelectedContactId)
    if (contactToAdd) {
      setParticipants((prev) => [
        ...prev,
        {
          contact_id: contactToAdd.id,
          name: contactToAdd.nom ?? 'N/A', // Assegurem que 'name' sigui string
          role: contactToAdd.job_title || 'Contacte', // ✅ Llegim 'job_title'
        },
      ])
    }
    setCurrentSelectedContactId(null)
    setIsModalOpen(false)
  }

  // Funció per eliminar un participant de la llista
  const removeParticipant = (contactId: number) => {
    setParticipants((prev) =>
      prev.filter((p) => p.contact_id !== contactId)
    )
  }

  // ... (La funció handleSubmit es queda exactament igual)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

        // ✨ MILLORA: Creem la ruta amb el teamId
        const filePath = `${teamId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('audio-uploads')
          .upload(filePath, file) // Pugem al path correcte: 'TEAM_ID/nom_fitxer.mp3'

        if (uploadError) {
          throw new Error(`Error pujant arxiu: ${uploadError.message}`)
        }

        // 'storagePath' ara és 'TEAM_ID/nom_fitxer.mp3'
        const result = await createAudioJob({
          storagePath: filePath,
          participants: participants,
          projectId: null,
        })

        if (result.error) {
          throw new Error(result.error)
        }

        toast.success('Èxit!', {
          description:
            "El teu àudio s'està processant. Veuràs els resultats aviat.",
        })

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
                disabled={isPending}
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
                    {p.name || 'N/A'} ({p.role}) {/* p.name és el 'nom' guardat */}
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.contact_id)}
                      className="rounded-full hover:bg-muted-foreground/20"
                      disabled={isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {participants.length === 0 && (
                  <span className="text-sm text-muted-foreground p-1">
                    Cap participant afegit...
                  </span>
                )}
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
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
                    {/*
                      ✅ 'availableContacts' és de tipus Contact[]
                      ContactSelector espera MinimalContact[] ({ id, nom })
                      Això és compatible, ja que Contact[] té 'id' i 'nom'.
                    */}
                    <ContactSelector
                      contacts={availableContacts}
                      selectedId={currentSelectedContactId}
                      onSelect={(id: number | null) =>
                        setCurrentSelectedContactId(id)
                      }
                      disabled={isPending}
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
                      disabled={!currentSelectedContactId}
                    >
                      Afegir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              Pujar i Processar
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}