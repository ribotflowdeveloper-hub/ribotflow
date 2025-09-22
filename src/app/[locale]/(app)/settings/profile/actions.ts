"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { revalidatePath } from "next/cache";

/**
 * Server Action per actualitzar totes les dades del perfil d'usuari.
 * Aquesta funció s'executa de forma segura al servidor quan s'envia el formulari principal del perfil.
 * @param formData Les dades del formulari enviades des del component de client.
 */
export async function updateProfileAction(formData: FormData) {
  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Usuari no autenticat." };
  }

  // --- Dades del Perfil General ---
  const fullName = formData.get('full_name') as string;
  const companyName = formData.get('company_name') as string;
  const summary = formData.get('summary') as string;
  const companyPhone = formData.get('company_phone') as string;
  const servicesInput = formData.get('services') as string;
  const street = formData.get('street') as string;
  const city = formData.get('city') as string;
  const postalCode = formData.get('postal_code') as string;
  const region = formData.get('region') as string;
  const country = formData.get('country') as string;
  
  // --- ✅ NOU: Dades de Facturació de l'Empresa ---
  const companyTaxId = formData.get('company_tax_id') as string;
  const companyAddress = formData.get('company_address') as string;
  const companyEmail = formData.get('company_email') as string;
  const logoUrl = formData.get('logo_url') as string; // Rebem la URL del logo des d'un camp ocult.

  const isPublicProfile = formData.get('is_public_profile') === 'on';
  const servicesArray = servicesInput.split(',').map(s => s.trim()).filter(Boolean);
  
  // Executem l'operació d'actualització ('update') a la taula 'profiles'.

  const { error } = await supabase
    .from('profiles')
    .update({ 
      // Perfil General
      full_name: fullName, 
      company_name: companyName,
      summary: summary,
      company_phone: companyPhone,
      services: servicesArray,
      street: street,
      city: city,
      postal_code: postalCode,
      region: region,
      country: country,
      is_public_profile: isPublicProfile,
      // ✅ NOU: Dades d'Empresa
      company_tax_id: companyTaxId,
      company_address: companyAddress,
      company_email: companyEmail,
      logo_url: logoUrl
    })
    .eq('id', user.id); // Assegurem que només actualitzem el perfil de l'usuari logat.
  
  
  if (error) {
  console.error("Error en actualitzar el perfil:", error);
  return { success: false, message: "No s'ha pogut actualitzar el perfil." };
}

// Informem a Next.js que les dades de la ruta '/settings/profile' han canviat,
// forçant una recàrrega de les dades a la pròxima visita.
revalidatePath('/settings/profile'); 

return { success: true, message: "Perfil actualitzat correctament." };
}

/**
* Server Action específica per a l'autodesat de la visibilitat del perfil.
* Es crida quan l'usuari activa o desactiva l'interruptor de "Perfil Públic".
* @param isPublic Un booleà que indica el nou estat de visibilitat.
*/
export async function updateProfileVisibilityAction(isPublic: boolean) {
const supabase = createClient(cookies())
;

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return { success: false, message: "Usuari no autenticat." };
}

// Aquesta acció només actualitza un únic camp a la base de dades.
const { error } = await supabase
  .from('profiles')
  .update({ is_public_profile: isPublic })
  .eq('id', user.id);

if (error) {
  console.error("Error en actualitzar la visibilitat:", error);
  return { success: false, message: "No s'ha pogut canviar la visibilitat." };
}

revalidatePath('/settings/profile');

return { success: true, message: `El perfil ara és ${isPublic ? 'públic' : 'privat'}.` };
}