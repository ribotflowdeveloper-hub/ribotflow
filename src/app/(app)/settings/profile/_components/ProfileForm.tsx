"use client";

import React, { useTransition } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { updateProfileAction } from '../actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Make sure Input is imported

// Props interface for the data coming from the server page
interface ProfileFormProps {
  profile: {
    full_name: string | null;
    company_name: string | null;
  };
  email: string;
}

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // This function is called when the form is submitted
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-effect rounded-xl p-8">
        <h2 className="text-xl font-semibold mb-6">Configuració del Perfil</h2>
        <form action={handleSubmit} className="space-y-6">
          
          <div>
            <Label htmlFor="full_name" className="block text-sm font-medium text-muted-foreground mb-2">Nom complet</Label>
            <Input
              id="full_name"
              name="full_name" // This 'name' is crucial for the Server Action
              type="text"
              defaultValue={profile.full_name || ''}
              className="search-input w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground mb-2">Nom de l'empresa</Label>
            <Input
              id="company_name"
              name="company_name" // This 'name' is crucial for the Server Action
              type="text"
              defaultValue={profile.company_name || ''}
              className="search-input w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Correu electrònic</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="search-input w-full bg-muted/50 cursor-not-allowed"
            />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isPending ? 'Desant...' : 'Desar Canvis'}
            </Button>
          </div>

        </form>
      </div>
    </motion.div>
  );
}