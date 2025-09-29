// src/components/shared/AccessDenied.tsx

import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-full min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl">Accés Denegat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sembla que no tens els permisos necessaris per a veure aquesta pàgina. 
            Si creus que és un error, contacta amb l'administrador del teu equip.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Torna al Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}