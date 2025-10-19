import { fetchPaginatedSuppliers, type SupplierFilters } from '../actions';
import { SuppliersClient } from './SuppliersClient';

interface SuppliersDataProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// Aquest component llegeix els paràmetres de la URL,
// construeix els filtres i fa la crida a la Server Action.
export async function SuppliersData({ searchParams }: SuppliersDataProps) {
  
  const page = parseInt(searchParams['page'] as string || '1', 10);
  const pageSize = parseInt(searchParams['pageSize'] as string || '10', 10);
  const searchTerm = searchParams['search'] as string | undefined;
  const sortBy = searchParams['sortBy'] as string || 'nom';
  const sortOrder = (searchParams['sortOrder'] as 'asc' | 'desc') || 'asc';

  const filters: SupplierFilters = {
    searchTerm,
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };

  // Crida a la Server Action per obtenir les dades
  const initialData = await fetchPaginatedSuppliers(filters);

  return (
    <SuppliersClient initialData={initialData} />
  );
}