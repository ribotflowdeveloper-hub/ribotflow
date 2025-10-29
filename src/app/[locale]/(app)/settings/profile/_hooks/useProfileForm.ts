'use client';

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { createClient } from '@/lib/supabase/client';
import { updateUserProfileAction, updateTeamAction } from '../actions';
import type { Team } from '@/types/settings';

interface UseProfileFormProps {
  team: Team | null;
}

export function useProfileForm({ team }: UseProfileFormProps) {
  const t = useTranslations('SettingsPage.SettingsProfile');
  
  // Estats i Transicions
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isTeamPending, startTeamTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  
  // Estat local per al logo, inicialitzat amb el valor del 'team'
  const [logoUrl, setLogoUrl] = useState(team?.logo_url || null);
  
  // --- Gestor de Càrrega del Logo ---
  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 👈 DEBUG 1: Comprovem que la funció s'executa
    console.log('[DEBUG] Iniciant handleLogoUpload...');
    
    const file = event.target.files?.[0];
    if (!file || !team) {
      console.warn('[DEBUG] No hi ha fitxer o no hi ha equip.');
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    
    const bucketName = 'assets-publics'; 
    const newFilePath = `logos/${team.id}/logo-${Date.now()}-${file.name}`;
    const oldLogoUrl = logoUrl; // El 'logoUrl' de l'estat d'aquest hook

    // 👈 DEBUG 2: Comprovem les dades abans de pujar
    console.log(`[DEBUG] Pujant a Bucket: ${bucketName}`);
    console.log(`[DEBUG] FilePath NOU: ${newFilePath}`);
    console.log(`[DEBUG] FilePath ANTIC (per esborrar): ${oldLogoUrl}`);

    // --- 2. Pujar el fitxer NOU ---
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newFilePath, file, {
        cacheControl: '3600', 
      });

    // 👈 DEBUG 3: AQUEST ÉS EL PUNT MÉS IMPORTANT (PUJADA)
    if (uploadError) {
      console.error('[DEBUG] ERROR en la pujada (uploadError):', uploadError);
      toast.error(t('toasts.logoUploadErrorTitle'), { description: uploadError.message });
      setIsUploading(false);
      return; // La funció mor aquí
    }
    
    console.log('[DEBUG] Pujada a Storage completada amb èxit.');

    // --- 3. Obtenir la URL pública del NOU fitxer ---
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(newFilePath);

    // 👈 DEBUG 4: Comprovem la URL pública
    if (!publicUrlData) {
      console.error('[DEBUG] ERROR: No s\'ha pogut obtenir la URL pública (publicUrlData és null).');
      toast.error(t('toasts.logoUploadErrorTitle'), { description: "No s'ha pogut obtenir la URL pública del nou logo." });
      setIsUploading(false);
      return;
    }

    const newLogoUrl = publicUrlData.publicUrl;
    console.log('[DEBUG] URL Pública obtinguda:', newLogoUrl);

    // --- 4. Actualitzar l'estat local i notificar ---
    setLogoUrl(newLogoUrl); // ✅ Actualitzem l'estat local del hook
    console.log('[DEBUG] setLogoUrl cridat amb èxit.'); // 👈 DEBUG 5
    toast.success(t('toasts.logoUploadSuccess'));

    // --- 5. Esborrar el fitxer ANTIC (si existia) ---
    if (oldLogoUrl) {
      try {
        const urlParts = oldLogoUrl.split(`/${bucketName}/`);
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1]; 
          const decodedOldFilePath = decodeURIComponent(oldFilePath);

          console.log("[DEBUG] Esborrant logo antic:", decodedOldFilePath);
          
          supabase.storage
            .from(bucketName)
            .remove([decodedOldFilePath])
            .then(({ error: removeError }) => {
              if (removeError) {
                console.warn("[DEBUG] No s'ha pogut esborrar el logo antic:", removeError.message);
              } else {
                console.log("[DEBUG] Logo antic esborrat amb èxit.");
              }
            });
        }
      } catch (e) {
        console.warn("[DEBUG] Error en processar l'antiga URL del logo per esborrar:", e);
      }
    }

    setIsUploading(false);
  }, [team, logoUrl, t]); // Afegim dependències

  // --- Gestor d'actualització del Perfil ---
  const handleUpdateProfile = (formData: FormData) => {
    startProfileTransition(async () => {
      const result = await updateUserProfileAction(formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  // --- Gestor d'actualització de l'Equip ---
  const handleUpdateTeam = (formData: FormData) => {
    // 👈 DEBUG 6: AQUEST ÉS EL SEGON PUNT MÉS IMPORTANT (DESAR)
    console.log(`[DEBUG] Enviant al servidor (handleUpdateTeam). Valor de logoUrl:`, logoUrl || 'null o buit');
    
    startTeamTransition(async () => {
      // Agafa la URL de l'estat del hook i l'afegeix al FormData
      formData.set('logo_url', logoUrl || ''); 
      const result = await updateTeamAction(formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  // Retornem tot el que el component necessita
  return {
    isProfilePending,
    isTeamPending,
    isUploading,
    logoUrl,
    handleLogoUpload,
    handleUpdateProfile,
    handleUpdateTeam
  };
}