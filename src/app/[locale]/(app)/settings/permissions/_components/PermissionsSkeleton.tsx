// src/app/[locale]/(app)/settings/permissions/_components/PermissionsSkeleton.tsx (FITXER NOU)
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PermissionsSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]"><Skeleton className="h-5 w-32" /></TableHead>
              <TableHead className="text-center"><Skeleton className="h-5 w-48 mx-auto" /></TableHead>
              <TableHead className="text-center"><Skeleton className="h-5 w-48 mx-auto" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2].map((granteeRow) => (
              <TableRow key={granteeRow}>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-end p-4 border-t">
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  );
}