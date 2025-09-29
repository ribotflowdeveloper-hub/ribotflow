import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ResetPasswordPageProps {
  searchParams: Promise<{ message?: string; code?: string; }>;
}

export default async function ResetPasswordPage({ searchParams: searchParamsPromise }: ResetPasswordPageProps) {
    const searchParams = await searchParamsPromise;

    const updatePassword = async (formData: FormData) => {
        "use server";
        const password = formData.get('password') as string;
        const code = formData.get('code') as string;
        const supabase = createClient(cookies());
        const locale = (await headers()).get('x-next-intl-locale') || 'ca';

        if (!code) {
            return redirect(`/${locale}/login?message=Token de restabliment invàlid.`);
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
            return redirect(`/${locale}/auth/reset-password?message=L'enllaç de restabliment és invàlid o ha caducat.`);
        }

        const { error: updateError } = await supabase.auth.updateUser({ password });
        
        if (updateError) {
            // ✅ CONSOLE.LOG PER A DEPURACIÓ
            console.error("Error en actualitzar la contrasenya (Supabase):", updateError);
            
            // Redirigim amb el missatge d'error REAL de Supabase
            return redirect(`/${locale}/auth/reset-password?message=${encodeURIComponent(updateError.message)}`);
        }
        
    
        return redirect(`/${locale}/login?message=La teva contrasenya s'ha actualitzat correctament.`);
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm space-y-6">
                <h1 className="text-2xl font-bold">Crea una nova contrasenya</h1>
                <form action={updatePassword} className="space-y-4">
                    <input type="hidden" name="code" value={searchParams.code} />
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Contrasenya</Label>
                        <Input id="password" name="password" type="password" required minLength={6} />
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