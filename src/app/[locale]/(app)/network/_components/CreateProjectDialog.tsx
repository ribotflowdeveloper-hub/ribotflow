"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from 'next-intl';
import type { DetailedAddress } from '@/types/shared/index';
import { createJobPostingAction } from '../actions';
import { toast } from 'sonner';
import AddressAutocomplete from './AddressAutocomplete';



// 🔹 Esquema de validació amb Zod
const projectFormSchema = z.object({
  title: z.string().min(5, "El títol ha de tenir almenys 5 caràcters"),
  description: z.string().optional(),
  address_text: z.string().min(5, "L'adreça és obligatòria"),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  required_skills: z.string().optional(),
  budget: z.number().nullable().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;
// ✅ 1. Definim les props que el component rep del pare (NetworkClient)
interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string; // L'ID de l'equip de l'usuari
}
// ✅ 2. Acceptem les props
export default function CreateProjectDialog({ open, onOpenChange, teamId }: CreateProjectDialogProps) {
  const t = useTranslations('NetworkPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // ❌ NO hi ha 'useState(false)' per a 'open', ja que es rep per props

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      address_text: '',
      latitude: null,
      longitude: null,
      required_skills: '',
      budget: null,
    },
  });

  const handleAddressSelect = (address: DetailedAddress) => {
    form.setValue('address_text', address.street, { shouldValidate: true });
    form.setValue('latitude', address.latitude);
    form.setValue('longitude', address.longitude);
  };

  const onSubmit = (values: ProjectFormValues) => {
    // Comprovem que tenim coordenades (l'autocompletat ha funcionat)
    if (!values.latitude || !values.longitude) {
      toast.error("Adreça invàlida", { description: "Si us plau, selecciona una adreça vàlida del cercador." });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('team_id', teamId);
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('address_text', values.address_text);
      formData.append('latitude', values.latitude!.toString());
      formData.append('longitude', values.longitude!.toString());
      if (values.required_skills) formData.append('required_skills', values.required_skills);
      if (values.budget) formData.append('budget', values.budget.toString());

      const result = await createJobPostingAction(formData);

      if (result.success) {
        toast.success('Projecte publicat correctament!');
        onOpenChange(false); // Tanca el modal
        form.reset();
        router.refresh(); // Refresca les dades del Server Component!
      } else {
        toast.error('Error al publicar el projecte', { description: result.message });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nou Projecte
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear un nou projecte</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Títol</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom del projecte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripció</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripció del projecte"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Integrem el component d'autocompletat */}
            <FormField
              control={form.control}
              name="address_text"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value}
                      onChange={field.onChange}
                      onAddressSelect={handleAddressSelect}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habilitats necessàries</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Fusteria, Electricitat..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pressupost (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Opcional"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Projecte
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
