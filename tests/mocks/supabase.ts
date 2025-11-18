// tests/mocks/supabase.ts
import { vi } from 'vitest';

// Helper per crear una cadena mockejable
const createChainableMock = () => {
  const mock = vi.fn();
  mock.mockReturnThis(); // Per defecte, retorna 'this' per encadenar
  return mock;
};

export const mockSupabase = {
  from: createChainableMock(),
  select: createChainableMock(),
  insert: createChainableMock(),
  update: createChainableMock(),
  delete: createChainableMock(),
  eq: createChainableMock(),
  or: createChainableMock(),
  order: createChainableMock(),
  range: createChainableMock(),
  is: createChainableMock(),
  limit: createChainableMock(),
  single: vi.fn(),
  
  // ✅ 3. Tipus segur en lloc de 'any'
  mockResolvedValue: (data: unknown) => {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
             single: vi.fn().mockResolvedValue({ data, error: null }),
             order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({ data, error: null, count: Array.isArray(data) ? data.length : 0 })
             })
          }),
          // Mockejem directament el resultat d'un insert
          single: vi.fn().mockResolvedValue({ data, error: null })
        }),
        insert: vi.fn().mockReturnValue({
           select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data, error: null })
           })
        })
      })
    }
  }
};