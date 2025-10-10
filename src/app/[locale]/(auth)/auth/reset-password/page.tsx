// /app/[locale]/auth/reset-password/_components/ResetPasswordClient.tsx
"use client";

import { useSearchParams } from 'next/navigation';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from '../actions'; // La mateixa acció

export default function ResetPasswordClient() {
    // Utilitzem el hook de client per obtenir els paràmetres de cerca de forma segura.
    const searchParams = useSearchParams();
    
    // Accedim als valors directament sense await
    const message = searchParams.get('message');
    const code = searchParams.get('code');

    // Nota: L'acció updatePasswordAction s'espera que gestioni l'absència de 'code'.
    
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm space-y-6">
                <h1 className="text-2xl font-bold">Crea una nova contrasenya</h1>
                
                <form action={updatePasswordAction} className="space-y-4">
                    {/* Utilitzem el valor obtingut del hook */}
                    <input type="hidden" name="code" value={code || ''} /> 
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Contrasenya</Label>
                        <Input id="password" name="password" type="password" required minLength={8} />
                    </div>
                    <Button type="submit" className="w-full">Actualitzar Contrasenya</Button>
                    
                    {message && (
                        <p className="text-sm text-center text-destructive p-2 bg-destructive/10 rounded-md">
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}