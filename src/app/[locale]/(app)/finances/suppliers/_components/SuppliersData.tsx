// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersData.tsx
import { fetchPaginatedSuppliers, type SupplierFilters } from '../actions';
import { SuppliersClient } from './SuppliersClient';

// ✅ Definim les props per rebre 'searchParams'
interface SuppliersDataProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

// Aquest component és 'async'
export async function SuppliersData({ searchParams }: SuppliersDataProps) {

  // ✅ Parsegem els valors AQUÍ.
  // Com que 'SuppliersData' té una 'key' única i està
  // dins de <Suspense>, Next.js ara ho gestionarà correctament.
  const page = parseInt(searchParams?.page ?? '1', 10);
  const pageSize = parseInt(searchParams?.pageSize ?? '10', 10);
  const search = searchParams?.search;
  const sortBy = searchParams?.sortBy || 'nom';
  const sortOrder = (searchParams?.sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  // Reconstruïm l'objecte 'filters'
  const filters: SupplierFilters = {
    searchTerm: search || undefined,
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  console.log('SuppliersData (amb key) - Calling action with filters:', filters);

  // Cridem l'acció
  const initialData = await fetchPaginatedSuppliers(filters);

  return (
    <SuppliersClient initialData={initialData} />
  );
}