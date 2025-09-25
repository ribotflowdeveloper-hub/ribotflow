import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PermissionsClient } from './_components/PermissionsClient';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";

// Definim aquí els tipus de dades per a aquesta pàgina
type Member = { id: string; full_name: string | null; email: string | null; };
type Permission = { grantee_user_id: string; target_user_id: string; };

export default async function PermissionsPage() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) redirect('/settings/team');

    // ✅ PAS 1: Comprovació de permisos a nivell de pàgina
    // Verifiquem el rol de l'usuari actual dins de l'equip actiu.
    const { data: currentUserMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', activeTeamId)
        .single();
    
    const canManagePermissions = ['owner', 'admin'].includes(currentUserMember?.role || '');

    // Si l'usuari no és owner o admin, li mostrem un missatge d'accés denegat.
    if (!canManagePermissions) {
        return (
            <Card className="max-w-lg mx-auto mt-10">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                        <TriangleAlert className="w-8 h-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4">Accés Denegat</CardTitle>
                    <CardDescription>
                        Només els propietaris i administradors de l'equip poden gestionar els permisos de la bústia d'entrada.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    // ✅ PAS 2: Carreguem les dades necessàries si l'usuari té permís
    const [membersRes, permissionsRes] = await Promise.all([
        supabase.from('team_members').select('profiles(id, full_name, email)').eq('team_id', activeTeamId),
        supabase.from('inbox_permissions').select('grantee_user_id, target_user_id').eq('team_id', activeTeamId)
    ]);

    const teamMembers: Member[] = membersRes.data?.map(m => m.profiles).filter(Boolean) as unknown as Member[] || [];
    const initialPermissions: Permission[] = permissionsRes.data || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Permisos de l'Inbox</h1>
                <p className="text-muted-foreground mt-2">
                    Selecciona les caselles per a permetre que un membre de l'equip pugui veure la bústia de correu d'un altre.
                </p>
            </div>
            <div className="mt-8">
                <PermissionsClient
                    teamMembers={teamMembers}
                    initialPermissions={initialPermissions}
                />
            </div>
        </div>
    );
}