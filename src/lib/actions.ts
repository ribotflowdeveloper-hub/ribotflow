import { createClient } from "./supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Defineix una estructura de retorn estàndard per a totes les Server Actions.
 * Això fa que la gestió de respostes al costat del client sigui més consistent.
 */
export interface ServerActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  newId?: string;
}

/**
 * Funció 'wrapper' d'ordre superior per a les Server Actions.
 * La seva funció és reduir el codi repetitiu encapsulant la lògica comuna:
 * 1. Crea el client de Supabase.
 * 2. Verifica que l'usuari estigui autenticat.
 * 3. Executa l'acció principal dins d'un bloc try/catch per a una gestió d'errors centralitzada.
 * 4. Revalida les rutes necessàries en cas d'èxit.
 * @param action La funció que conté la lògica de negoci específica de l'acció.
 * @param pathsToRevalidate Un array opcional de rutes a revalidar.
 */
export async function withUser<T>(
  action: (
    supabase: ReturnType<typeof createClient>,
    userId: string
  ) => Promise<ServerActionResult<T>>,
  pathsToRevalidate?: string[]
): Promise<ServerActionResult<T>> {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: "Usuari no autenticat." };

  try {
    // Executem l'acció específica passada com a paràmetre.
    const result = await action(supabase, user.id);
    // Si l'acció té èxit i s'han especificat rutes, les revalidem.
    if (result.success && pathsToRevalidate) {
      pathsToRevalidate.forEach((p) => revalidatePath(p));
    }
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconegut";
    return { success: false, message };
  }
}