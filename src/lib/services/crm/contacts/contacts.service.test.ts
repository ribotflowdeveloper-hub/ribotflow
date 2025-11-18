import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as contactService from './contacts.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// 1. Dades de prova (Fixtures)
const mockContact = {
  id: 1,
  nom: 'Test User',
  email: 'test@example.com',
  team_id: 'team-123',
  created_at: '2023-01-01',
  // Afegim camps opcionals per complir amb el tipus Contact si cal, o deixem que el Partial funcioni en el mock
};

// 2. Definició del Mock del QueryBuilder
// Això simula l'objecte que retorna .from('...')
const queryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
} as unknown; // El marquem com unknown inicialment per facilitar el casting posterior si calgués interfícies específiques

// 3. Creem un Mock manual per al client de Supabase
// Fem un 'cast' segur cap a SupabaseClient<Database> utilitzant 'unknown' com a pas intermedi
const supabaseMock = {
  from: vi.fn(() => queryBuilder), 
} as unknown as SupabaseClient<Database>;

// Helper per accedir als mètodes del mock sense errors de tipus en els 'expect'
// Això ens permet tractar queryBuilder com un objecte amb funcions mockejades (vi.fn)
const mockQueryBuilder = queryBuilder as {
    range: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    or: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
};


describe('Contacts Service', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- TEST 1: Llegir contactes (getPaginatedContacts) ---
  describe('getPaginatedContacts', () => {
    it('should fetch contacts with pagination and filtering', async () => {
      // A. Preparem el Mock per retornar èxit
      const mockData = [mockContact];
      
      // Simulem que l'última funció de la cadena (range) retorna les dades
      mockQueryBuilder.range.mockResolvedValue({ data: mockData, error: null, count: 1 });

      // B. Executem la funció passant el mock tipat
      const result = await contactService.getPaginatedContacts(supabaseMock, {
        teamId: 'team-123',
        page: 1,
        searchTerm: 'Test',
        sortBy: 'newest'
      });

      // C. Assertions (Validacions)
      
      // 1. Comprovem que ha cridat a la taula 'contacts'
      expect(supabaseMock.from).toHaveBeenCalledWith('contacts');
      
      // 2. Comprovem que ha filtrat pel team_id correcte
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('team_id', 'team-123');
      
      // 3. Comprovem que ha aplicat la cerca
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(expect.stringContaining('Test'));
      
      // 4. Comprovem que el resultat és el que esperem
      expect(result.contacts).toEqual(mockData);
      expect(result.totalCount).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
        // A. Simulem un error de Supabase
        mockQueryBuilder.range.mockResolvedValue({ 
            data: null, 
            error: { message: 'Connection failed' }, 
            count: 0 
        });

        // B. Esperem que la funció llanci una excepció
        await expect(
            contactService.getPaginatedContacts(supabaseMock, { teamId: '123' })
        ).rejects.toThrow('Error carregant contactes: Connection failed');
    });
  });

  // --- TEST 2: Crear contacte (createContact) ---
  describe('createContact', () => {
    it('should create a new contact correctly', async () => {
        // A. Preparem el formData
        const formData = new FormData();
        formData.append('nom', 'Nou Client');
        formData.append('email', 'nou@client.com');
        formData.append('estat', 'Lead');

        // B. Preparem el Mock per l'Insert
        // Quan fem .select().single(), retorna el nou contacte
        // Nota: select() retorna 'this' (el builder), i sobre aquest builder cridem .single()
        mockQueryBuilder.select.mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { ...mockContact, nom: 'Nou Client' }, error: null })
        });

        // C. Executem
        const result = await contactService.createContact(
            supabaseMock,
            formData,
            'user-123',
            'team-123'
        );

        // D. Validem
        expect(supabaseMock.from).toHaveBeenCalledWith('contacts');
        
        // Validem que s'ha cridat insert amb les dades correctes
        expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
            nom: 'Nou Client',
            email: 'nou@client.com',
            team_id: 'team-123',
            user_id: 'user-123'
        }));
        
        expect(result.nom).toBe('Nou Client');
    });

    it('should validate required fields', async () => {
        const formData = new FormData();
        // No posem nom ni email

        await expect(
            contactService.createContact(supabaseMock, formData, 'u1', 't1')
        ).rejects.toThrow("El nom i l'email són obligatoris.");
    });
  });
});