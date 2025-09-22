import { createClient } from "./supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export interface ServerActionResult<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    newId?: string;
}

export async function withUser<T>(
    action: (
        supabase: ReturnType<typeof createClient>,
        userId: string
    ) => Promise<ServerActionResult<T>>,
    pathsToRevalidate?: string[]
): Promise<ServerActionResult<T>> {
    // Obtenim les cookies resolent la promesa
    const cookieStore = await cookies();
    // Creem el client passant les cookies ja resoltes
    const supabase = createClient(cookies())
;
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Usuari no autenticat." };

    try {
        const result = await action(supabase, user.id);
        if (result.success && pathsToRevalidate) {
            pathsToRevalidate.forEach((p) => revalidatePath(p));
        }
        return result;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconegut";
        return { success: false, message };
    }
}