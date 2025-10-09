// /app/[locale]/auth/reset-password/page.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// ✅ 1. Importem l'acció des del seu fitxer centralitzat
import { updatePasswordAction } from '../actions';

interface ResetPasswordPageProps {
  searchParams: { message?: string; code?: string; };
}

// ✅ Hem tret l' 'await' de les props per a simplificar
export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm space-y-6">
                <h1 className="text-2xl font-bold">Crea una nova contrasenya</h1>
                {/* ✅ 2. Cridem l'acció importada */}
                <form action={updatePasswordAction} className="space-y-4">
                    <input type="hidden" name="code" value={searchParams.code} />
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Contrasenya</Label>
                        <Input id="password" name="password" type="password" required minLength={8} />
                    </div>
                    <Button type="submit" className="w-full">Actualitzar Contrasenya</Button>
                    {searchParams?.message && (
                        <p className="text-sm text-center text-destructive p-2 bg-destructive/10 rounded-md">
                            {searchParams.message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}