// src/app/[locale]/(app)/crm/contactes/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as actions from './actions';
import * as contactService from '@/lib/services/crm/contacts/contacts.service';
import * as permissions from '@/lib/permissions/permissions';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
// ✅ 1. Importem el tipus Contact des de la definició de la BD
import type { Contact } from '@/types/db';

// 1. Fem Mock dels mòduls externs
vi.mock('@/lib/services/crm/contacts/contacts.service');
vi.mock('@/lib/permissions/permissions');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Tipus auxiliar per als mocks
type MockValidationSuccess = {
    user: { id: string };
    activeTeamId: string;
    supabase: SupabaseClient<Database>;
};

type MockValidationError = {
    error: { message: string };
};

describe('Contact Actions (Integration)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- TEST 1: createContactAction ---
  describe('createContactAction', () => {
    
    it('should create a contact successfully if authorized', async () => {
      // A. SIMULEM QUE L'USUARI TÉ PERMISOS
      vi.spyOn(permissions, 'validateActionAndUsage').mockResolvedValue({
        user: { id: 'user-123' },
        activeTeamId: 'team-123',
        supabase: {} as unknown as SupabaseClient<Database>, 
      } as unknown as MockValidationSuccess & MockValidationError); 

      // B. SIMULEM QUE EL SERVEI RETORNA ÈXIT
      // ✅ 2. Utilitzem el tipus 'Contact' importat directament
      vi.spyOn(contactService, 'createContact').mockResolvedValue({
        id: 1,
        nom: 'Nou Contacte',
        email: 'test@test.com',
      } as unknown as Contact);

      // C. EXECUTEM L'ACCIÓ
      const formData = new FormData();
      formData.append('nom', 'Nou Contacte');
      formData.append('email', 'test@test.com');

      const result = await actions.createContactAction(formData);

      // D. VALIDEM
      expect(result.success).toBe(true);
      if (result.success && result.data) {
          expect(result.data.nom).toBe('Nou Contacte');
      }
      
      expect(contactService.createContact).toHaveBeenCalledWith(
        expect.anything(), 
        formData,
        'user-123',
        'team-123'
      );
    });

    it('should block request if user has NO permission or limit reached', async () => {
      // A. SIMULEM ERROR DE PERMISOS
      vi.spyOn(permissions, 'validateActionAndUsage').mockResolvedValue({
        error: { message: 'Límit assolit o sense permisos' }
      } as unknown as MockValidationSuccess & MockValidationError);

      const formData = new FormData();
      const result = await actions.createContactAction(formData);

      // B. VALIDEM QUE HA FALLAT
      expect(result.success).toBe(false);
      expect(result.message).toBe('Límit assolit o sense permisos');
      expect(contactService.createContact).not.toHaveBeenCalled(); 
    });
  });

 // --- TEST 2: fetchContactsAction ---
  describe('fetchContactsAction', () => {
      it('should return contacts if session is valid', async () => {
          // Simulem sessió OK
          // ✅ CORRECCIÓ: Afegim 'user' i fem servir els tipus Mock en lloc de 'any'
          vi.spyOn(permissions, 'validateSessionAndPermission').mockResolvedValue({
              activeTeamId: 'team-123',
              user: { id: 'user-123' }, // Afegim l'usuari per complir amb la interfície
              supabase: {} as unknown as SupabaseClient<Database>
          } as unknown as MockValidationSuccess & MockValidationError); 

          // Simulem dades del servei
          // ✅ CORRECCIÓ: Utilitzem el tipus importat de 'contactService' en lloc de 'any'
          vi.spyOn(contactService, 'getPaginatedContacts').mockResolvedValue({
              contacts: [{ id: 1, nom: 'Test' }] as unknown as contactService.ContactWithOpportunities[],
              totalPages: 1,
              currentPage: 1,
              totalCount: 1
          });

          const result = await actions.fetchContactsAction();

          expect(result.success).toBe(true);
          if(result.success && result.data) {
             expect(result.data).toHaveLength(1);
          }
      });

      it('should fail if session is invalid', async () => {
          // Simulem error de sessió
          // ✅ CORRECCIÓ: Tipem l'error específicament en lloc de 'any'
          vi.spyOn(permissions, 'validateSessionAndPermission').mockResolvedValue({
              error: { message: 'No session' }
          } as unknown as MockValidationSuccess & MockValidationError);

          const result = await actions.fetchContactsAction();

          expect(result.success).toBe(false);
          expect(result.message).toBe('No session');
      });
    });
});