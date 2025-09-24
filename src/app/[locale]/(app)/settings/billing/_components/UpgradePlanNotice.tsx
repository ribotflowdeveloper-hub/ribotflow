"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem } from 'lucide-react'; // Icona per a funcionalitats premium

interface UpgradePlanNoticeProps {
    featureName: string;
    requiredPlan: string;
    locale: string;
}

export function UpgradePlanNotice({ featureName, requiredPlan, locale }: UpgradePlanNoticeProps) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <Gem className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">Funcionalitat Premium</CardTitle>
                    <CardDescription>
                        El teu pla actual no inclou accés a la funcionalitat de <span className="font-semibold">{featureName}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>
                        Per a poder utilitzar aquesta eina, si us plau, millora la teva subscripció al pla <span className="font-semibold">{requiredPlan}</span> o superior.
                    </p>
                    <Button asChild size="lg">
                        <Link href={`/${locale}/settings/billing`}>
                            Veure Plans i Preus
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}