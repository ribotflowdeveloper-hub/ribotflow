"use client";

import { useTransition } from 'react';
import { signupAction } from '@/app/[locale]/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';

// ✅ Actualitzem les props per acceptar 'teamName'
type InvitedSignupFormProps = {
  inviteToken?: string;
  invitedEmail?: string;
  teamName?: string | null; // Pot ser string o null si no es troba
};

export function InvitedSignupForm({ inviteToken, invitedEmail, teamName }: InvitedSignupFormProps) {
  const [isPending, startTransition] = useTransition();

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
          {/* ✅ Text dinàmic: mostrem el nom de l'equip */}
          Estàs a punt d'unir-te a <strong>{teamName || "l'equip"}</strong>. Només has de completar el teu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          
          <input type="hidden" name="invite_token" value={inviteToken} />

          {/* ... camps d'email, nom i contrasenya (es queden igual) ... */}
          <div className="space-y-2">
            <Label htmlFor="email">El teu correu electrònic</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={invitedEmail || ''}
                readOnly={true}
                className="pl-10 bg-muted/60 cursor-not-allowed focus-visible:ring-transparent"
              />
            </div>
          </div>
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
                placeholder="Mínim 6 caràcters"
                required
                minLength={6}
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
              // ✅ Text del botó també dinàmic
              `Unir-se a ${teamName || "l'equip"}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}