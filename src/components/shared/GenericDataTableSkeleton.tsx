// src/components/shared/GenericDataTableSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";

interface GenericDataTableSkeletonProps {
  /** Nombre de columnes a mostrar (incloent accions) */
  columnCount?: number;
  /** Nombre de files a simular */
  rowCount?: number;
  /** Classe CSS addicional per al contenidor principal */
  className?: string;
  /** Mostrar skeleton per a la capçalera de pàgina (PageHeader)? */
  showPageHeaderSkeleton?: boolean; // <-- Nova prop
  /** Mostrar skeleton per a la barra de filtres? */
  showFiltersSkeleton?: boolean;
  /** Quants controls de filtre (Selects) mostrar a la barra (a més del cercador) */
  filterControlCount?: number; // <-- Nova prop
}

export function GenericDataTableSkeleton({
  columnCount = 6, // Ajustat per defecte (ex: quotes)
  rowCount = 10,
  className,
  showPageHeaderSkeleton = true, // Per defecte, mostrem capçalera
  showFiltersSkeleton = true,
  filterControlCount = 1, // Per defecte, 1 filtre (com status a quotes)
}: GenericDataTableSkeletonProps) {

  const safeColumnCount = Math.max(1, columnCount);
  const safeRowCount = Math.max(1, rowCount);
  // Assegurem que el recompte de filtres sigui almenys 0
  const safeFilterControlCount = Math.max(0, filterControlCount);

  return (
    // ✅ Mantenim flex-col, ajustem espai a gap-4 per coherència
    <div className={cn("h-full flex flex-col gap-4", className)}>

      {/* ✅ Skeleton per a PageHeader */}
      {showPageHeaderSkeleton && (
        <div className="flex justify-between items-center">
          {/* Títol (i descripció si la tingués) */}
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" /> {/* Títol */}
            {/* <Skeleton className="h-4 w-64" /> */} {/* Descripció opcional */}
          </div>
          {/* Botó d'acció (ex: Nou) */}
          <Skeleton className="h-9 w-32" />
        </div>
      )}

      {/* Skeleton per a la Barra de Filtres/Accions */}
      {showFiltersSkeleton && (
        <div className="flex justify-between items-center">
          {/* Controls de Filtre */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48" /> {/* Cerca */}
            {/* Generem Skeletons per als filtres addicionals */}
            {Array.from({ length: safeFilterControlCount }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-32" />
            ))}
          </div>
          {/* Botó Columnes */}
          <Skeleton className="h-9 w-24" />
        </div>
      )}

      {/* Skeleton de la Taula */}
      {/* ✅ Eliminem flex-grow d'aquí per posar-lo al contenidor pare si cal */}
      <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
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
                  <TableCell key={cellIndex} className="py-2"> {/* Ajustat padding */}
                    <Skeleton className={`h-4 ${cellIndex === 0 ? 'w-3/4' : 'w-full'}`} /> {/* Ajustat amplada */}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Skeleton de la Paginació (es manté igual) */}
      <div className="flex items-center justify-between mt-auto pt-2 px-2"> {/* Afegit mt-auto per empènyer avall */}
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