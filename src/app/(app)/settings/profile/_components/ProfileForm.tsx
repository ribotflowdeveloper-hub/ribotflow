// src/app/(app)/settings/profile/_components/ProfileForm.tsx
"use client";

import { useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { updateProfileAction } from '../actions';

// Rep les dades inicials del Server Component
export function ProfileForm({ profile, email }: { profile: { full_name: string, company_name: string }, email: string }) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.success) {
        toast({ title: "Èxit!", description: result.message });
      } else {
        toast({ variant: 'destructive', title: "Error", description: result.message });
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-2">Nom complet</label>
        <input
          id="fullName"
          name="full_name" // El 'name' és crucial per a FormData
          type="text"
          defaultValue={profile?.full_name || ''}
          className="search-input w-full"
        />
      </div>
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium mb-2">Nom de l'empresa</label>
        <input
          id="companyName"
          name="company_name" // El 'name' és crucial per a FormData
          type="text"
          defaultValue={profile?.company_name || ''}
          className="search-input w-full"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">Correu electrònic</label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="search-input w-full bg-muted/50 cursor-not-allowed"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isPending ? 'Desant...' : 'Desar Canvis'}
        </Button>
      </div>
    </form>
  );
}