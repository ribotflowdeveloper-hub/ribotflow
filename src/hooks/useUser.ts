import { createClient } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { useState, useEffect, useMemo } from 'react';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [teamRole, setTeamRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                const currentUser = session?.user || null;
                // Actualitzem l'usuari immediatament. Això causa una primera re-renderització.
                setUser(currentUser);

                // Imprimim els logs per depurar
                console.log("\n--- onAuthStateChange EVENT (Non-blocking) ---");
                console.log("Event:", event);

                if (currentUser) {
                    const activeTeamId = currentUser.app_metadata?.active_team_id;
                    if (activeTeamId) {
                        // Llança la consulta a la BD, però no l'esperis amb 'await'.
                        // Utilitza .then() per processar el resultat quan arribi.
                        supabase
                            .from('team_members')
                            .select('role')
                            .eq('user_id', currentUser.id)
                            .eq('team_id', activeTeamId)
                            .single()
                            .then(({ data: member }) => {
                                // Quan la consulta acabi, actualitza l'estat del rol.
                                // Això causarà una segona re-renderització, però ja de forma segura.
                                setTeamRole(member?.role || null);
                                setIsLoading(false); // Marquem com a carregat quan tenim tota la info.
                                console.log("Rol obtingut:", member?.role || null);
                                console.log("-----------------------------\n");
                            });
                    } else {
                        // Si no hi ha equip actiu, netegem el rol i finalitzem la càrrega.
                        setTeamRole(null);
                        setIsLoading(false);
                        console.log("No hi ha equip actiu.");
                        console.log("-----------------------------\n");
                    }
                } else {
                    // Si no hi ha usuari, netegem tot i finalitzem la càrrega.
                    setTeamRole(null);
                    setIsLoading(false);
                    console.log("Usuari desconnectat.");
                    console.log("-----------------------------\n");
                }
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]);

    return { user, teamRole, isLoading };
}