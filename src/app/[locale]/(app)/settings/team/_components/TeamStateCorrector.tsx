"use client";

import { useEffect, useState } from 'react'; // Importem useState
import { useTransition } from 'react';
import { toast } from 'sonner';
import { clearActiveTeamAction } from '../actions';
import { Button } from '@/components/ui/button'; // Importem el botó per a reintentar

export function TeamStateCorrector() {
    const [, startTransition] = useTransition();
    // Afegim un estat per guardar el missatge d'error
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const runCorrection = () => {
        setErrorMessage(null); // Resetejem l'error abans de començar
        startTransition(async () => {
            console.log("[CLIENT] Estat invàlid detectat. Executant neteja...");
            const result = await clearActiveTeamAction();
            if (result?.success === false) {
                const message = result.message || "Hi ha hagut un error inesperat.";
                toast.error("Error en corregir l'estat de l'equip.", { description: message });
                setErrorMessage(message); // Guardem l'error a l'estat
            } else {
                window.location.reload();
            }
        });
    };

    // Executem la correcció només un cop quan el component es munta
    useEffect(() => {
        runCorrection();
    }, []); 

    // Renderitzem condicionalment segons si hi ha error o no
    return (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
            {errorMessage ? (
                <>
                    <p className="text-destructive">No s'ha pogut corregir l'estat de l'equip.</p>
                    <p className="text-sm text-muted-foreground">{errorMessage}</p>
                    <Button onClick={runCorrection}>Reintentar</Button>
                </>
            ) : (
                <p>Corregint estat de l'equip...</p>
            )}
        </div>
    );
}