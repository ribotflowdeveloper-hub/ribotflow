"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface LegalModalTriggerProps {
  triggerText: string
  title: string
  children: React.ReactNode
}

export function LegalModalTrigger({
  triggerText,
  title,
  children,
}: LegalModalTriggerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="underline hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
        >
          {triggerText}
        </button>
      </DialogTrigger>
      {/* Mantenim la mida gran */}
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
        {/* Header es manté igual */}
        <DialogHeader className="p-6 pb-5 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>

        {/* Botó X es manté igual */}
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-muted-foreground"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Tancar</span>
          </Button>
        </DialogClose>

        {/* Contingut amb Scroll */}
        {/* ✅ Assegurem que l'àrea de scroll ocupi l'espai i tingui scroll automàtic */}
        <ScrollArea className="flex-1 overflow-y-auto">
          {/* Donem padding intern al text */}
          <div className="px-6 py-8">{children}</div>
        </ScrollArea>

        {/* Footer */}
        {/* ✅ Eliminem 'sticky' - flexbox s'encarregarà de posar-lo a baix.
           Afegim 'mt-auto' per assegurar-nos que s'enganxi a baix si el contingut és curt.
           Afegim 'flex-shrink-0' per evitar que s'encongeixi. */}
        <DialogFooter className="p-4 border-t bg-background z-10 mt-auto flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline" size="lg">
              Tancar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}