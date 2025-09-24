import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { useState, useEffect, useMemo } from 'react';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [teamRole, setTeamRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Utilitzem useMemo per a crear el client de Supabase només una vegada
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        // Aquesta funció s'executarà immediatament i cada vegada que l'estat d'autenticació canviï
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null;
                setUser(currentUser);

                console.log("\n--- onAuthStateChange EVENT ---");
                console.log("Event:", event);
                console.log("User:", currentUser);
                console.log("Pla actiu (del token):", currentUser?.app_metadata?.active_team_plan);

                if (currentUser) {
                    const activeTeamId = currentUser.app_metadata?.active_team_id;
                    if (activeTeamId) {
                        // Si hi ha un equip actiu, busquem el rol
                        const { data: member } = await supabase
                            .from('team_members')
                            .select('role')
                            .eq('user_id', currentUser.id)
                            .eq('team_id', activeTeamId)
                            .single();
                        
                        setTeamRole(member?.role || null);
                        console.log("Rol a l'equip actiu:", member?.role || null);
                    } else {
                        // Si no hi ha equip actiu, netegem el rol
                        setTeamRole(null);
                        console.log("No hi ha equip actiu seleccionat.");
                    }
                } else {
                    // Si l'usuari tanca la sessió, netegem tot
                    setTeamRole(null);
                }
                
                setIsLoading(false);
                console.log("-----------------------------\n");
            }
        );

        // Aquesta funció es crida quan el component es desmunta, per a netejar la subscripció
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]);

    return { user, teamRole, isLoading };
}