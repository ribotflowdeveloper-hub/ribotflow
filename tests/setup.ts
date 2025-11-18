// tests/setup.ts
import { vi, beforeEach } from 'vitest'; // ✅ Importem beforeEach explícitament

beforeEach(() => {
  vi.clearAllMocks();
});