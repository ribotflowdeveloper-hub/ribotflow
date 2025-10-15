import { Suspense } from 'react';
import CalendarData from './_components/CalendarData';
import CalendarSkeleton from './_components/CalendarSkeleton';

export default function CalendarPage() {
  return (
    // Utilitzem un contenidor que no afegeix marges o paddings verticals innecessaris
    <div className="h-full w-full">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData />
      </Suspense>
    </div>
  );
}