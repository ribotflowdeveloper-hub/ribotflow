"use client";

import { useTransition } from 'react';
import { signupAction } from '@/app/[locale]/(auth)/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';

type InvitedSignupFormProps = {
  inviteToken?: string;
  invitedEmail?: string;
  teamName?: string | null;
};

export function InvitedSignupForm({ inviteToken, invitedEmail, teamName }: InvitedSignupFormProps) {
  const [isPending, startTransition] = useTransition();
  console.log("Props rebudes al formulari:", { inviteToken, invitedEmail, teamName });

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      signupAction(formData);
    });
  };
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Benvingut/da a Bord!</CardTitle>
        <CardDescription>
          Estàs a punt d'unir-te a <strong>{teamName || "l'equip"}</strong>. Només has de completar el teu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">

          {/* Aquest input ocult és per al token, està perfecte. */}
          <input type="hidden" name="invite_token" value={inviteToken} />

          {/* El camp de l'email ja està configurat per a enviar-se amb el formulari
                        gràcies al 'name="email"'. És visible però no editable. Perfecte! */}
          <div className="space-y-2">
            <Label htmlFor="email">El teu correu electrònic</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email" // Aquesta línia l'envia amb el formulari
                type="email"
                required
                defaultValue={invitedEmail || ''}
                readOnly={true} // Aquesta línia evita que es pugui editar
                className="pl-10 bg-muted/60 cursor-not-allowed focus-visible:ring-transparent"
              />
            </div>
          </div>

          {/* La resta del formulari es queda igual */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom i cognoms</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                name="fullName"
                placeholder="El teu nom complet"
                required
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Crea una contrasenya</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínim 8 caràcters" // <-- Canvi aquí
                required
                minLength={8} // <-- Canvi aquí
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creant compte...
              </>
            ) : (
              `Unir-se a ${teamName || "l'equip"}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}