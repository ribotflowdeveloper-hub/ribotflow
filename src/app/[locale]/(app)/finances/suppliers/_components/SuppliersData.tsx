// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersData.tsx
// ✅ Importem SupplierFilters de nou
import { fetchPaginatedSuppliers, type SupplierFilters } from '../actions';
import { SuppliersClient } from './SuppliersClient';

// ✅ Definim les noves props que rep aquest component
interface SuppliersDataProps {
  page: string;
  pageSize: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export async function SuppliersData({
  page: pageProp,
  pageSize: pageSizeProp,
  search,
  sortBy: sortByProp,
  sortOrder: sortOrderProp,
}: SuppliersDataProps) {

  // ✅ Parsegem els valors rebuts com a props
  const page = parseInt(pageProp, 10);
  const pageSize = parseInt(pageSizeProp, 10);
  const sortBy = sortByProp || 'nom';
  const sortOrder = (sortOrderProp === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  // ✅ Reconstruïm l'objecte 'filters'
  const filters: SupplierFilters = {
    searchTerm: search || undefined,
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  console.log('SuppliersData - Calling action with filters:', filters);

  // ✅ Cridem l'acció amb l'objecte 'filters'
  const initialData = await fetchPaginatedSuppliers(filters);

  console.log('SuppliersData - Received initialData:', initialData);

  return (
    <SuppliersClient initialData={initialData} />
  );
}