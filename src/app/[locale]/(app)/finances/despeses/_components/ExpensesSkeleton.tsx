import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const SKELETON_ROWS = 8;

/**
 * Esquelet de càrrega professional per a la llista de Despeses.
 * * ✅ El Per Què: Assegura un Time To Interactive (TTI) ràpid mostrant 
 * una previsualització de la interfície mentre el Server Component obté les dades.
 */
export function ExpensesSkeleton() {
    return (
        <div className="space-y-8 p-4">
            {/* Capçalera - Títol i Botó de Creació */}
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            <Card className="shadow-lg border border-border overflow-hidden">
                <CardContent className="p-0">
                    {/* Fila d'Header (simulació de TableHeader) */}
                    <div className="flex items-center bg-muted/50 p-4 border-b">
                        <Skeleton className="h-4 w-[10%]" /> {/* Número */}
                        <Skeleton className="h-4 w-[20%] ml-4" /> {/* Proveïdor */}
                        <Skeleton className="h-4 w-[30%] ml-4" /> {/* Descripció */}
                        <Skeleton className="h-4 w-[10%] ml-4" /> {/* Data */}
                        <Skeleton className="h-4 w-[10%] ml-4" /> {/* Total */}
                        <Skeleton className="h-4 w-[10%] ml-4" /> {/* Estatus */}
                        <Skeleton className="h-4 w-[5%] ml-4" /> {/* Accions */}
                    </div>

                    {/* Fila de Dades (Simulació de TableRow) */}
                    {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                        <div key={index} className="flex items-center p-4 border-b last:border-b-0 min-h-[58px]">
                            {/* Número de factura */}
                            <div className="w-[10%]"><Skeleton className="h-4 w-[70px]" /></div>
                            {/* Proveïdor */}
                            <div className="w-[20%] ml-4"><Skeleton className="h-4 w-[120px]" /></div>
                            {/* Descripció */}
                            <div className="w-[30%] ml-4"><Skeleton className="h-4 w-[95%]" /></div>
                            {/* Data */}
                            <div className="w-[10%] ml-4"><Skeleton className="h-4 w-[80px]" /></div>
                            {/* Total */}
                            <div className="w-[10%] ml-4"><Skeleton className="h-4 w-[70px]" /></div>
                            {/* Estatus */}
                            <div className="w-[10%] ml-4"><Skeleton className="h-6 w-[70px] rounded-full" /></div>
                            {/* Accions */}
                            <div className="w-[5%] flex justify-end gap-2 ml-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}