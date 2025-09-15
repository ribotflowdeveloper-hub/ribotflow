/**
 * @file page.tsx (Login)
 * @summary Aquest fitxer defineix la pàgina d'inici de sessió i registre de l'aplicació.
 * És un Component de Client, ja que necessita gestionar l'estat del formulari
 * (email, contrasenya), la interacció de l'usuari (clics) i la comunicació
 * amb Supabase des del navegador.
 */

"use client"; // Marca aquest component per executar-se només al navegador.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import Image from 'next/image';
// Importacions dels components d'UI de shadcn/ui.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner'; // Llibreria per a notificacions (toasts).
import { createClient } from '@/lib/supabase/client'; // Client de Supabase per al costat del client.

// Importacions d'icones de la llibreria lucide-react.
import { Loader2, Sparkles, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  // --- Gestió de l'Estat del Component ---
  const [email, setEmail] = useState(''); // Estat per al camp d'email.
  const [password, setPassword] = useState(''); // Estat per al camp de contrasenya.
  const [loading, setLoading] = useState(false); // Estat per mostrar indicadors de càrrega.
  const [isSignUp, setIsSignUp] = useState(false); // Estat per canviar entre la vista de Login i la de Sign Up.
  
  const router = useRouter(); // Hook de Next.js per a la navegació programàtica.
  const supabase = createClient(); // Inicialitzem el client de Supabase per al navegador.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; // URL del lloc, necessària per a les redireccions d'email.
  
  /**
   * @summary Gestor unificat per a l'enviament del formulari, tant per a registre com per a inici de sessió.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevenim el comportament per defecte del formulari.
    setLoading(true);

    if (isSignUp) {
      // --- Lògica de Registre (Sign Up) ---
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Indiquem a Supabase a quina URL ha de redirigir l'usuari després de fer clic a l'enllaç de verificació.
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Error en el registre", { description: error.message });
      } else {
        toast.success("Registre completat!", { description: "Revisa el teu correu per verificar el compte." });
        setIsSignUp(false); // Tornem a la vista de login després del registre.
      }
    } else {
      // --- Lògica d'Inici de Sessió (Sign In) ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error("Error d'inici de sessió", { description: "Les credencials són incorrectes." });
      } else {
        // Després de l'inici de sessió, redirigim al dashboard i refresquem la sessió del servidor.
        router.push('/dashboard');
        router.refresh(); 
      }
    }
    setLoading(false);
  };

  /**
   * @summary Gestor per a l'inici de sessió amb proveïdors externs (OAuth), com Google.
   * @param {'google' | 'github'} provider - El nom del proveïdor OAuth.
   */
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // La URL a la qual el proveïdor ha de retornar l'usuari després de l'autenticació.
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    // No cal fer res més aquí; Supabase gestiona automàticament la redirecció a la pàgina de Google.
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