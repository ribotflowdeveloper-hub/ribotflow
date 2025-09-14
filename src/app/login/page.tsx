// src/app/login/page.tsx
"use client"; // Marca aquest component per executar-se només al navegador

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import Image from 'next/image';
// Importacions dels teus components i utilitats
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { createClient } from '@/lib/supabase/client';

// Importacions d'icones
import { Loader2, Sparkles, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

// Metadata: La forma correcta de gestionar el <head> a Next.js
// Això només funciona a Server Components, així que el posarem al layout o pàgina pare si calgués
// export const metadata: Metadata = {
//   title: 'Inici de Sessió | Ribot',
// };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const router = useRouter();

  const supabase = createClient();
  // Obtenim la URL del lloc des de les variables d'entorn
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  // Gestor unificat per al formulari
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // Lògica de Registre (Sign Up)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // ✅ CORRECCIÓ: Fem servir la variable d'entorn
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Error en el registre", { description: error.message });

      } else {
        toast.success("Registre completat!", { description: "Revisa el teu correu per verificar el compte." });

        setIsSignUp(false); // Torna a la vista de login
      }
    } else {
      // Lògica d'Inici de Sessió (Sign In)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error("Error d'inici de sessió", { description: "Les credencials són incorrectes." });

      } else {
        // Redirigim i refresquem la sessió del servidor
        router.push('/dashboard');
        router.refresh(); 
      }
    }
    setLoading(false);
  };

  // Gestor per a l'inici de sessió amb proveïdors externs (Google, etc.)
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,

        //redirectTo: `${location.origin}/auth/callback`,
      },
    });
    // Supabase s'encarrega de la redirecció
  };

  return (
    <>
      {/* A Next.js, el títol es gestiona amb l'objecte metadata exportat */}
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-3xl font-bold gradient-text">Ribot</h1>
              </div>
              <p className="text-muted-foreground">{isSignUp ? "Crea un nou compte" : "Benvingut de nou"}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="correu@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-12 w-full"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Contrasenya"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-12 w-full"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full text-base py-6">
                {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? <><UserPlus className="mr-2"/>Registrar-se</> : <><LogIn className="mr-2"/>Iniciar sessió</>)}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-sm"><span className="bg-card px-2 text-muted-foreground">O continua amb</span></div>
            </div>

            <div className="space-y-4">
              <Button onClick={() => handleOAuthLogin('google')} variant="outline" className="w-full py-6">
              <Image
                className="w-5 h-5 mr-3"
                alt="Google logo"
                src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg"
                width={20}  // ✅ AFEGEIX AIXÒ
                height={20} // ✅ AFEGEIX AIXÒ
              />              
              Inicia sessió amb Google
              </Button>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {isSignUp ? "Ja tens un compte?" : "Encara no tens un compte?"}{' '}
              <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary hover:underline">
                {isSignUp ? "Entra aquí" : "Registra't"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}