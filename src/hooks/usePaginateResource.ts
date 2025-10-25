// src/hooks/usePaginatedResource.ts
import { useState, useEffect, useTransition, useRef, useCallback } from 'react'; // Afegim useCallbackimport { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { type ColumnDef } from "@/components/shared/GenericDataTable";
import { type ActionResult } from "@/types/shared/actionResult"; // Assegura't que aquest tipus existeix
import { useDebounce } from 'use-debounce';
// --- Definicions de Tipus Genèrics ---
// Aquests tipus haurien de viure en un fitxer compartit,
// com 'src/types/shared/pagination.ts'

/**
 * La resposta paginada esperada del servidor.
 * @template TData El tipus de dades dels items.
 */
export interface PaginatedResponse<TData> {
  data: TData[];
  count: number;
}

/**
 * Els paràmetres que la funció de 'fetch' genèrica rebrà.
 * @template TFilters El tipus dels filtres específics d'aquesta pàgina.
 */
export interface PaginatedActionParams<TFilters> {
  searchTerm: string;
  filters: TFilters;
  sortBy: string;
  sortOrder: "asc" | "desc";
  limit: number;
  offset: number;
}

// --- Props del Hook ---

interface UsePaginatedResourceProps<
  TData extends { id: string | number },
  TFilters,
> {
  /** Dades inicials carregades al Server Component */
  initialData: PaginatedResponse<TData>;
  /** Estat inicial per als filtres específics */
  initialFilters: TFilters;
  /** Ordenació inicial */
  initialSort: { column: string; order: "asc" | "desc" };
  /** Definició de totes les columnes (per gestionar visibilitat) */
  allColumns: ColumnDef<TData>[];
  /** La Server Action que s'ha de cridar per anar a buscar dades */
  fetchAction: (
    params: PaginatedActionParams<TFilters>,
  ) => Promise<PaginatedResponse<TData>>;
  /** (Opcional) La Server Action que s'ha de cridar per eliminar un item */
  deleteAction?: (id: string | number) => Promise<ActionResult>;
  /** Límit d'items per pàgina */
  initialRowsPerPage?: number;
  rowsPerPageOptions?: number[]; // Opcional, per passar a la taula
  onDeleteSuccess?: () => void;
  toastMessages?: {
    deleteSuccess?: string;
    deleteError?: string;
  };
}

const DEFAULT_ROWS_PER_PAGE = 10;
/**
 * Hook genèric per gestionar la lògica d'un recurs paginat (dades, filtres,
 * ordenació, paginació, eliminació i visibilitat de columnes).
 */
export function usePaginatedResource<
  TData extends { id: string | number },
  TFilters,
>({
  initialData,
  initialFilters,
  initialSort,
  allColumns,
  fetchAction,
  deleteAction,
  initialRowsPerPage = DEFAULT_ROWS_PER_PAGE,
  rowsPerPageOptions, // Rebem les opcions per retornar-les
  onDeleteSuccess,
  toastMessages,
}: UsePaginatedResourceProps<TData, TFilters>) {
  const [isPending, startTransition] = useTransition();

  // --- Estats ---
  const [data, setData] = useState<TData[]>(initialData.data);
  const [page, setPage] = useState(1);
  // ✅ Nou estat per rowsPerPage
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  // ✅ TotalPages ara és un estat que depèn de count i rowsPerPage
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialData.count / rowsPerPage),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [sorting, setSorting] = useState(initialSort);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);

  // Estat d'eliminació
  const [itemToDelete, setItemToDelete] = useState<TData | null>(null);

  // Estat de visibilitat de columnes
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      initialState[col.accessorKey.toString()] = true;
    });
    return initialState;
  });

  // --- Gestors d'Estat ---

  const toggleColumnVisibility = (columnKey: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  // ✅ Nou gestor per canviar rowsPerPage
  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    // Validació bàsica
    if (newRowsPerPage > 0 && newRowsPerPage !== rowsPerPage) {
      setRowsPerPage(newRowsPerPage);
      setPage(1); // <-- Important: Reseteja a la pàgina 1
      // No cal fer refetch aquí, l'efecte ho farà
    }
  }, [rowsPerPage]); // Depèn de rowsPerPage per comparar
  const handleSort = (columnKey: string) => {
    setSorting((prev) => {
      const isSameColumn = prev.column === columnKey;
      const newOrder = isSameColumn && prev.order === "asc" ? "desc" : "asc";
      return { column: columnKey, order: newOrder as "asc" | "desc" };
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  /**
   * Gestor genèric per actualitzar l'estat dels filtres.
   */
  const handleFilterChange = <K extends keyof TFilters>(
    key: K,
    value: TFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    // Assegurem que newPage estigui dins dels límits vàlids (1 a totalPages)
    const validPage = Math.max(1, Math.min(newPage, totalPages || 1)); // || 1 per evitar 0
    if (validPage !== page) {
      setPage(validPage);
      window.scrollTo(0, 0);
    }
  };

  // Quan filtre/cerca/ordre canvia, reseteja pàgina (rowsPerPage no reseteja pàgina aquí)
  useEffect(() => {
    if (isInitialMount.current) return;
    setPage(1);
  }, [debouncedSearchTerm, filters, sorting]);

  // Efecte principal per carregar dades
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    startTransition(async () => {
      // ✅ offset ara depèn de 'page' i 'rowsPerPage'
      const offset = (page - 1) * rowsPerPage;

      const params: PaginatedActionParams<TFilters> = {
        searchTerm: debouncedSearchTerm,
        filters: filters,
        sortBy: sorting.column,
        sortOrder: sorting.order,
        // ✅ Passem el 'rowsPerPage' actual com a límit
        limit: rowsPerPage,
        offset: offset,
      };

      try {
        const result = await fetchAction(params);
        setData(result.data);
        // ✅ Actualitzem totalPages basant-nos en el nou count i rowsPerPage
        const newTotalPages = Math.ceil(result.count / rowsPerPage);
        setTotalPages(newTotalPages > 0 ? newTotalPages : 1); // Assegura mínim 1 pàgina

        // Correcció si estem en una pàgina que ja no existeix (després de canviar filtres/rowsPerPage)
        if (page > newTotalPages && newTotalPages > 0) {
            setPage(newTotalPages); // Ves a l'última pàgina vàlida
        } else if (newTotalPages === 0 && page !== 1) {
            setPage(1); // Si no hi ha resultats, ves a la pàgina 1
        }

      } catch (error) {
        console.error("Error fetching paginated resource:", error);
        toast.error("Error en carregar les dades.");
      }
    });
    // ✅ Afegim 'rowsPerPage' a les dependències de l'efecte!
  }, [page, rowsPerPage, debouncedSearchTerm, filters, sorting, fetchAction]);


  // --- Lògica d'Eliminació ---
  const handleDelete = () => {
    if (!itemToDelete || !deleteAction) return;

    startTransition(async () => {
        const currentItemId = itemToDelete.id; // Guardem l'ID per si itemToDelete canvia
        const result = await deleteAction(currentItemId);
        if (result.success) {
            toast.success(toastMessages?.deleteSuccess || result.message || "Item eliminat.");
            setItemToDelete(null); // Primer neteja l'estat
            onDeleteSuccess?.();

            // Lògica de recàrrega de dades millorada
            setData(prevData => prevData.filter(item => item.id !== currentItemId)); // Elimina directament de l'estat local

            // Si hem eliminat l'últim element d'una pàgina que no era la primera,
            // hem de navegar a la pàgina anterior.
            // Fem la comprovació *abans* de recalcular totalPages.
            if (data.length === 1 && page > 1) {
                setPage(prevPage => Math.max(1, prevPage - 1));
            } else {
                 // Si no, forcem un refetch de la pàgina actual només si és necessari
                 // (potser ja no cal amb la neteja de 'data')
                 // Considera si realment necessites forçar un refetch aquí o si
                 // la UI ja s'actualitza correctament amb setData.
                 // Per assegurar consistència amb el count del backend:
                 isInitialMount.current = false; // Permet que l'efecte s'executi
                 // Canviem una dependència per forçar l'efecte
                 setFilters(f => ({ ...f })); 
            }

        } else {
            toast.error(toastMessages?.deleteError || result.message || "Error en eliminar.");
        }
    });
  };

  return {
    isPending,
    data,
    itemToDelete,
    setItemToDelete,
    handleDelete,
    columnVisibility,
    toggleColumnVisibility,
    searchTerm,
    handleSearchChange,
    filters,
    handleFilterChange,
    currentSortColumn: sorting.column,
    currentSortOrder: sorting.order,
    handleSort,
    
    // Gestió de paginació
    page,
    totalPages,
    handlePageChange,
    // ✅ Retornem l'estat i el gestor nous
    rowsPerPage,
    handleRowsPerPageChange,
    rowsPerPageOptions, // Retornem les opcions per passar-les a la taula
  };
}