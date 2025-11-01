"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
// ✅ 1. JA NO NECESSITEM 'dynamic' ni 'Skeleton'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';
import type { DetailedAddress } from '@/types/shared/index';
import { createJobPostingAction } from '../actions';
import { toast } from 'sonner';
// ✅ 2. Importem el nou component directament
import AddressAutocomplete from './AddressAutocomplete';

// Esquema de validació amb Zod (local)
const projectFormSchema = z.object({
    title: z.string().min(5, "El títol ha de tenir almenys 5 caràcters"),
    description: z.string().optional(),
    address_text: z.string().min(5, "L'adreça és obligatòria"),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    required_skills: z.string().optional(),
    budget: z.number().nullable().optional(),
});
type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: string;
}

export default function CreateProjectDialog({ open, onOpenChange, teamId }: CreateProjectDialogProps) {
    const t = useTranslations('NetworkPage');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            title: '',
            description: '',
            address_text: '',
            latitude: null,
            longitude: null,
            city: '',
            region: '',
            postcode: '',
            country: '',
            required_skills: '',
            budget: null,
        },
    });

    const handleAddressSelect = (address: DetailedAddress) => {
        form.setValue('address_text', address.street, { shouldValidate: true });
        form.setValue('latitude', address.latitude);
        form.setValue('longitude', address.longitude);
        form.setValue('city', address.city || '');
        form.setValue('region', address.region || '');
        form.setValue('postcode', address.postcode || '');
        form.setValue('country', address.country || '');
    };

    const onSubmit = (values: ProjectFormValues) => {
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
            if (values.city) formData.append('city', values.city);
            if (values.region) formData.append('region', values.region);
            if (values.postcode) formData.append('postcode', values.postcode);
            if (values.country) formData.append('country', values.country);
            if (values.required_skills) formData.append('required_skills', values.required_skills);
            if (values.budget) formData.append('budget', values.budget.toString());

            const result = await createJobPostingAction(formData);

            if (result.success) {
                toast.success('Projecte publicat correctament!');
                onOpenChange(false);
                form.reset();
                router.refresh();
            } else {
                toast.error('Error al publicar el projecte', { description: result.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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

                        <FormField
                            control={form.control}
                            name="address_text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carrer (amb cercador)</FormLabel>
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Població</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Població" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="postcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Codi Postal</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Codi Postal" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="region"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Província</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Província" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>País</FormLabel>
                                        <FormControl>
                                            <Input placeholder="País" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="required_skills"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Habilitats necessàries</FormLabel>
                                    {/* ✅ CORRECCIÓ: Eliminats caràcters 'nbsp;' i 'F' */}
                                    <FormControl>
                                        <Input placeholder="Ex: Fusteria, Electricitat..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                {/* ✅ CORRECCIÓ: Afegit </FormItem> que faltava */}
                                </FormItem>
                                // ✅ Codi corrupte eliminat
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