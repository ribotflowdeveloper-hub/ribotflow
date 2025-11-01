// Ubicació: /hooks/useUser.ts

import { createClient } from "@/lib/supabase/client";
import { type User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
// ✅ 1. Importem el tipus 'ActiveTeam' que necessitarem
import type { ActiveTeam } from "@/types/app/navigation";

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [teamRole, setTeamRole] = useState<string | null>(null);
    // ✅ 2. Afegim un nou estat per guardar l'objecte de l'equip actiu
    const [activeTeam, setActiveTeam] = useState<ActiveTeam | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                const currentUser = session?.user || null;
                setUser(currentUser);

                console.log("\n--- onAuthStateChange EVENT (Non-blocking) ---");
                console.log("Event:", event);

                if (currentUser) {
                    const activeTeamId = currentUser.app_metadata
                        ?.active_team_id;
                    if (activeTeamId) {
                        console.log("Usuari amb equip actiu ID:", activeTeamId);

                        // ✅ 3. Creem les dues consultes en paral·lel
                        const rolePromise = supabase
                            .from("team_members")
                            .select("role")
                            .eq("user_id", currentUser.id)
                            .eq("team_id", activeTeamId)
                            .single();

                        // Suposem que 'ActiveTeam' necessita id, name, i logo_url. Ajusta si cal.
                        const teamPromise = supabase
                            .from("teams")
                            .select("id, name, logo_url")
                            .eq("id", activeTeamId)
                            .single();

                        // ✅ 4. Executem les promeses
                        Promise.all([rolePromise, teamPromise])
                            .then(([roleResult, teamResult]) => {
                                const member = roleResult.data;
                                const team = teamResult.data;

                                // Actualitzem tots els estats alhora
                                setTeamRole(member?.role || null);
                                setActiveTeam(team as ActiveTeam || null);
                                setIsLoading(false); // Marquem com a carregat quan tenim tota la info.

                                console.log(
                                    "Rol obtingut:",
                                    member?.role || null,
                                );
                                console.log(
                                    "Equip actiu obtingut:",
                                    team || null,
                                );
                                console.log("-----------------------------\n");
                            })
                            .catch((error) => {
                                console.error(
                                    "Error en carregar dades de sessió (rol/equip):",
                                    error,
                                );
                                setTeamRole(null);
                                setActiveTeam(null);
                                setIsLoading(false);
                            });
                    } else {
                        // Si no hi ha equip actiu, netegem tot i finalitzem la càrrega.
                        setTeamRole(null);
                        setActiveTeam(null); // ✅ 5. Resetejem l'equip actiu
                        setIsLoading(false);
                        console.log("No hi ha equip actiu.");
                        console.log("-----------------------------\n");
                    }
                } else {
                    // Si no hi ha usuari, netegem tot i finalitzem la càrrega.
                    setUser(null); // Assegurem que l'usuari també es neteja
                    setTeamRole(null);
                    setActiveTeam(null); // ✅ 5. Resetejem l'equip actiu
                    setIsLoading(false);
                    console.log("Usuari desconnectat.");
                    console.log("-----------------------------\n");
                }
            },
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]);

    // ✅ 6. Afegim 'activeTeam' al valor de retorn
    return { user, teamRole, activeTeam, isLoading };
}
