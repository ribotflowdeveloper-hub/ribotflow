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
  
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isTeamPending, startTeamTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState(team?.logo_url || null);
  
  // --- Gestor de Càrrega del Logo (CORREGIT) ---
  const handleLogoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    const oldLogoUrl = logoUrl; 

    console.log(`[DEBUG] Pujant a Bucket: ${bucketName}`);
    console.log(`[DEBUG] FilePath NOU: ${newFilePath}`);
    console.log(`[DEBUG] FilePath ANTIC (per esborrar): ${oldLogoUrl}`);

    // --- 1. Pujar el fitxer NOU ---
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newFilePath, file, {
        cacheControl: '3600', 
      });

    if (uploadError) {
      console.error('[DEBUG] ERROR en la pujada (uploadError):', uploadError);
      toast.error(t('toasts.logoUploadErrorTitle'), { description: uploadError.message });
      setIsUploading(false);
      return;
    }
    
    console.log('[DEBUG] Pujada a Storage completada amb èxit.');

    // --- 2. Obtenir la URL pública del NOU fitxer ---
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(newFilePath);

    if (!publicUrlData) {
      console.error('[DEBUG] ERROR: No s\'ha pogut obtenir la URL pública (publicUrlData és null).');
      toast.error(t('toasts.logoUploadErrorTitle'), { description: "No s'ha pogut obtenir la URL pública del nou logo." });
      setIsUploading(false);
      return;
    }

    const newLogoUrl = publicUrlData.publicUrl;
    console.log('[DEBUG] URL Pública obtinguda:', newLogoUrl);

    // ✅ --- 3. ACTUALITZAR L'ESTAT LOCAL ---
    // Hem eliminat la crida a la BBDD. Ara només actualitzem l'estat del hook.
    setLogoUrl(newLogoUrl); 
    console.log('[DEBUG] setLogoUrl cridat amb èxit.');
    
    // Canviem el missatge per informar l'usuari
    toast.success(t('toasts.logoUploadSuccess'), {
      // És una bona pràctica afegir aquesta descripció a 'ca.json'
      description: t('toasts.logoUploadSuccessDescription') || "Prem 'Desar canvis de l'empresa' per a desar el nou logo."
    });

    // --- 4. Esborrar el fitxer ANTIC (ara que la BBDD s'ha actualitzat) ---
    // (Això és correcte, neteja fire-and-forget)
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
  }, [team, logoUrl, t]); // Afegim 't' al array de dependències

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
    console.log(`[DEBUG] Enviant al servidor (handleUpdateTeam). Valor de logoUrl:`, logoUrl || 'null o buit');
    
    startTeamTransition(async () => {
      // Aquesta línia ara és correcta, perquè 'logoUrl' SÍ que estarà sincronitzat.
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