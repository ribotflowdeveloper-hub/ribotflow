import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Esquelet de càrrega professional per a la vista de detall de Despesa.
 * * ✅ El Per Què: Simula l'estructura visual del formulari d'edició/creació,
 * orientant l'usuari sobre on es carregarà el contingut.
 */
export function ExpenseDetailSkeleton() {
    return (
        <div className="space-y-8 p-4">
            {/* Capçalera - Títol i Accions */}
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-8 w-64" />
                <div className="flex space-x-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>

            {/* Contingut Principal (Grid de 3 columnes típic d'editor/detall) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Esquerra (Formulari Principal) - 2/3 */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Targeta 1: Detalls Bàsics */}
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Camps de selecció (Proveïdor, Data) */}
                                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                                <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /></div>
                            </div>
                            {/* Camp de text (Descripció/Número de factura) */}
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        </CardContent>
                    </Card>

                    {/* Targeta 2: Conceptes/Línies d'Article */}
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-52" /></CardHeader>
                        <CardContent className="space-y-4">
                            {/* Línia d'Article de capçalera (simulada) */}
                            <div className="flex space-x-4 border-b pb-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-4 w-1/4" />
                            </div>
                            {/* Línies d'article */}
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex space-x-4">
                                    <Skeleton className="h-10 w-1/2" />
                                    <Skeleton className="h-10 w-1/4" />
                                    <Skeleton className="h-10 w-1/4" />
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Dreta (Metadades) - 1/3 */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Targeta 3: Sumari i Totals */}
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
                            <div className="flex justify-between"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
                            <Separator />
                            <div className="flex justify-between"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-6 w-1/3" /></div>
                        </CardContent>
                    </Card>

                    {/* Targeta 4: Adjunts */}
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-8 w-24 rounded-lg" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}