"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck } from 'lucide-react';

function CheckEmailMessage() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    if (!email) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No s'ha proporcionat cap correu electrònic.</p>
                </CardContent>
            </Card>
        );
    }


    // AQUEST COMPONENT ARA NOMÉS MOSTRA EL MISSATGE. NO TÉ useEffect NI LÒGICA DE REDIRECCIÓ.
    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
                    <MailCheck className="w-8 h-8" />
                </div>
                <CardTitle className="mt-4 text-2xl">Només un pas més!</CardTitle>
                <CardDescription>
                    T'hem enviat un enllaç de confirmació a <br/>
                    <strong className="text-foreground">{email}</strong>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Si us plau, fes clic a l'enllaç per activar el teu compte. Si no el veus, revisa la teva carpeta de correu brossa (spam).
                </p>
                <p className="text-xs text-muted-foreground mt-6">
                    Pots tancar aquesta pestanya un cop hagis confirmat el correu a l'altra.
                </p>
            </CardContent>
        </Card>
    );
}

export default function CheckEmailPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Suspense>
                <CheckEmailMessage />
            </Suspense>
        </div>
    );
}