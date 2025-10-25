// src/components/shared/GenericDataTableSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils"; // Importa cn si vols afegir classes opcionals

interface GenericDataTableSkeletonProps {
  /** Nombre de columnes a mostrar a l'skeleton (incloent accions si escau) */
  columnCount?: number;
  /** Nombre de files de dades a simular */
  rowCount?: number;
  /** Classe CSS addicional per al contenidor principal */
  className?: string;
  /** Opcional: Mostrar skeleton per a la barra de filtres/accions superior? */
  showFiltersSkeleton?: boolean;
}

export function GenericDataTableSkeleton({
  columnCount = 5, // Valor per defecte raonable
  rowCount = 10,  // Valor per defecte comú
  className,
  showFiltersSkeleton = true, // Per defecte, mostrem els filtres
}: GenericDataTableSkeletonProps) {

  // Assegurem valors mínims
  const safeColumnCount = Math.max(1, columnCount);
  const safeRowCount = Math.max(1, rowCount);

  return (
    <div className={cn("h-full flex flex-col space-y-4", className)}>

      {/* Skeleton Opcional per a la Barra de Filtres/Accions */}
      {showFiltersSkeleton && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48" /> {/* Cerca */}
            <Skeleton className="h-9 w-32" /> {/* Filtre 1 */}
            <Skeleton className="h-9 w-32" /> {/* Filtre 2 */}
          </div>
          <Skeleton className="h-9 w-24" /> {/* Botó Vista/Columnes */}
        </div>
      )}

      {/* Skeleton de la Taula */}
      <div className="flex-grow rounded-xl border bg-card shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: safeColumnCount }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-5 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: safeRowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: safeColumnCount }).map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    {/* Variem una mica l'amplada per a més realisme */}
                    <Skeleton className={`h-4 ${cellIndex === 0 ? 'w-24' : 'w-full'}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Skeleton de la Paginació */}
      <div className="flex items-center justify-between px-2">
        {/* Skeleton Files per pàgina */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-[70px]" />
        </div>
        {/* Skeleton Botons Paginació */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8" /> {/* Primera */}
          <Skeleton className="h-8 w-8" /> {/* Anterior */}
          <Skeleton className="h-8 w-8 rounded-md" /> {/* Num 1 */}
          <Skeleton className="h-8 w-8 rounded-md" /> {/* Num 2 */}
          <Skeleton className="h-8 w-8 rounded-md" /> {/* Num 3 */}
          <Skeleton className="h-8 w-8" /> {/* Següent */}
          <Skeleton className="h-8 w-8" /> {/* Última */}
        </div>
        {/* Skeleton Info Pàgina */}
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}