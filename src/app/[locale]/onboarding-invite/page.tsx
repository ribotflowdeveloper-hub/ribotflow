"use client";

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateInvitedUserProfileAction } from './actions';

export default function InvitedOnboardingPage() {
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await updateInvitedUserProfileAction(formData);
            if (result?.success === false) {
                toast.error(result.message);
            }
            // La redirecció del servidor s'encarregarà de la resta en cas d'èxit.
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Benvingut/da a l'equip!</CardTitle>
                    <CardDescription>
                        Només un últim pas. Si us plau, completa el teu perfil.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nom i cognoms</Label>
                            <Input id="fullName" name="fullName" placeholder="El teu nom complet" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telèfon (Opcional)</Label>
                            <Input id="phone" name="phone" placeholder="El teu número de telèfon" />
                        </div>
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? "Desant..." : "Guardar i accedir"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}