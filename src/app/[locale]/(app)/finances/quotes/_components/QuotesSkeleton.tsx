"use client";


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


/**
 * @summary Mostra un esquelet de càrrega per a la pàgina de llista de Pressupostos.
 */
export function QuotesSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Esquelet de la capçalera */}
      <div className="flex justify-between items-center mb-8">
        <div className="h-9 w-48 bg-gray-700/50 rounded-md"></div>
        <div className="h-10 w-40 bg-gray-700/50 rounded-md"></div>
      </div>

      {/* Esquelet de la taula */}
      <div className="glass-card">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(6)].map((_, i) => (
                <TableHead key={i}><div className="h-5 w-24 bg-gray-700/50 rounded-md"></div></TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className="border-b-transparent">
                {[...Array(6)].map((_, j) => (
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