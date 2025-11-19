import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { type ColumnDef } from "@/components/shared/GenericDataTable";
import { type ActionResult } from "@/types/shared/actionResult";
import { useDebounce } from "use-debounce";

// --- Definicions de Tipus Genèrics ---

export interface PaginatedResponse<TData> {
  data: TData[];
  count: number;
}

/**
 * Els paràmetres que la funció de 'fetch' genèrica rebrà.
 * Afegeixo 'page' aquí perquè les Server Actions el puguin fer servir.
 */
export interface PaginatedActionParams<TFilters> {
  page: number; // ✅ AFEGIT: Necessari per a la coherència amb les Actions
  searchTerm: string; // ✅ String obligatori (buit si no hi ha cerca)
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
  initialData: PaginatedResponse<TData>;
  initialFilters: TFilters;
  initialSort: { column: string; order: "asc" | "desc" };
  allColumns: ColumnDef<TData>[];

  // La fetchAction ha de coincidir exactament amb PaginatedActionParams
  fetchAction: (
    params: PaginatedActionParams<TFilters>,
  ) => Promise<PaginatedResponse<TData>>;

  deleteAction?: (id: string | number) => Promise<ActionResult>;
  initialRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  onDeleteSuccess?: () => void;
  toastMessages?: {
    deleteSuccess?: string;
    deleteError?: string;
  };
}

const DEFAULT_ROWS_PER_PAGE = 10;

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
  rowsPerPageOptions,
  onDeleteSuccess,
  toastMessages,
}: UsePaginatedResourceProps<TData, TFilters>) {
  const [isPending, startTransition] = useTransition();

  // --- Estats ---
  const [data, setData] = useState<TData[]>(initialData.data);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialData.count / rowsPerPage) || 1, // Evitem 0 pàgines inicialment
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const [sorting, setSorting] = useState(initialSort);

  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);

  const [itemToDelete, setItemToDelete] = useState<TData | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      initialState[col.accessorKey.toString()] = true;
    });
    return initialState;
  });

  // --- Gestors ---

  const toggleColumnVisibility = (columnKey: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    if (newRowsPerPage > 0 && newRowsPerPage !== rowsPerPage) {
      setRowsPerPage(newRowsPerPage);
      setPage(1);
    }
  }, [rowsPerPage]);

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

  const handleFilterChange = <K extends keyof TFilters>(
    key: K,
    value: TFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || 1));
    if (validPage !== page) {
      setPage(validPage);
      window.scrollTo(0, 0);
    }
  };

  // Reseteja pàgina en canviar filtres
  useEffect(() => {
    if (isInitialMount.current) return;
    setPage(1);
  }, [debouncedSearchTerm, filters, sorting]);

  // Efecte principal (Fetch)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Si les dades inicials estan buides però haurien d'haver-n'hi, potser voldries fer un fetch aquí,
      // però normalment confiem en initialData.
      return;
    }

    startTransition(async () => {
      const offset = (page - 1) * rowsPerPage;

      // ✅ AQUI ÉS ON S'UNEIXEN ELS MÓNS
      // Construïm l'objecte que coincideix amb PaginatedActionParams
      const params: PaginatedActionParams<TFilters> = {
        page: page, // ✅ Incloem page
        limit: rowsPerPage, // limit
        offset: offset, // offset
        searchTerm: debouncedSearchTerm, // string obligatori
        filters: filters,
        sortBy: sorting.column,
        sortOrder: sorting.order,
      };

      try {
        const result = await fetchAction(params);
        setData(result.data);

        const newTotalPages = Math.ceil(result.count / rowsPerPage);
        setTotalPages(newTotalPages > 0 ? newTotalPages : 1);

        if (page > newTotalPages && newTotalPages > 0) {
          setPage(newTotalPages);
        } else if (newTotalPages === 0 && page !== 1) {
          setPage(1);
        }
      } catch (error) {
        console.error("Error fetching paginated resource:", error);
        toast.error("Error en carregar les dades.");
      }
    });
  }, [page, rowsPerPage, debouncedSearchTerm, filters, sorting, fetchAction]);

  // --- Delete ---
  const handleDelete = () => {
    if (!itemToDelete || !deleteAction) return;

    startTransition(async () => {
      const currentItemId = itemToDelete.id;
      const result = await deleteAction(currentItemId);
      if (result.success) {
        toast.success(
          toastMessages?.deleteSuccess || result.message || "Item eliminat.",
        );
        setItemToDelete(null);
        onDeleteSuccess?.();

        setData((prevData) =>
          prevData.filter((item) => item.id !== currentItemId)
        );

        if (data.length === 1 && page > 1) {
          setPage((prevPage) => Math.max(1, prevPage - 1));
        } else {
          // Forcem re-render o refetch si calgués
          // setFilters(f => ({ ...f }));
        }
      } else {
        toast.error(
          toastMessages?.deleteError || result.message || "Error en eliminar.",
        );
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
    page,
    totalPages,
    handlePageChange,
    rowsPerPage,
    handleRowsPerPageChange,
    rowsPerPageOptions,
  };
}
