import { Suspense } from 'react';
import CalendarData from './_components/CalendarData';
import CalendarSkeleton from './_components/CalendarSkeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Calendari de l'Equip</CardTitle>
          <CardDescription>
            Gestiona les tasques del teu equip amb una vista de calendari interactiva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<CalendarSkeleton />}>
            {/* Ja no passem cap prop a CalendarData */}
            <CalendarData />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}