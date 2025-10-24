"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de Productes/Conceptes.
 */
export function ProductsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Esquelet de la capçalera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-gray-700/50 rounded-md"></div>
          <div className="h-5 w-72 bg-gray-700/50 rounded-md mt-2"></div>
        </div>
        <div className="h-10 w-40 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Esquelet dels filtres */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="h-10 max-w-sm w-full bg-gray-700/50 rounded-md"></div>
        <div className="h-10 w-full md:w-[200px] bg-gray-700/50 rounded-md"></div>
        <div className="h-10 w-[100px] bg-gray-700/50 rounded-md ml-auto"></div>
      </div>

      {/* Esquelet de la taula */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(5)].map((_, i) => (
                <TableHead key={i}><div className="h-5 w-24 bg-gray-700/50 rounded-md"></div></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(5)].map((_, j) => (
                  <TableCell key={j}><div className="h-6 bg-gray-700/50 rounded-md"></div></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}