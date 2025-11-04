// src/app/[locale]/(app)/settings/permissions/_components/PermissionsClient.tsx (FITXER CORREGIT)
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateInboxPermissionsAction } from '../actions';
import { Loader2 } from 'lucide-react';
import type { Role } from '@/lib/permissions/permissions.config'; // ✅ Importem Role

// ✅ 1. Definim tipus de dades clars (extrets del servei)
type Member = { id: string; full_name: string | null; email: string | null; };
type Permission = { grantee_user_id: string; target_user_id: string; };

// ✅ 2. Afegim 'currentUserRole' als props
export function PermissionsClient({ teamMembers, initialPermissions, currentUserRole }: {
  teamMembers: Member[];
  initialPermissions: Permission[];
  currentUserRole: Role | null;
}) {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [isPending, startTransition] = useTransition();

  // ✅ 3. Definim si es pot gestionar (doble comprovació, coherent amb altres clients)
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handlePermissionChange = (granteeId: string, targetId: string, isChecked: boolean) => {
    if (isChecked) {
      setPermissions(prev => [...prev, { grantee_user_id: granteeId, target_user_id: targetId }]);
    } else {
      setPermissions(prev => prev.filter(p => !(p.grantee_user_id === granteeId && p.target_user_id === targetId)));
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInboxPermissionsAction(permissions);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Membre de l'equip</TableHead>
              {teamMembers.map(targetUser => (
                <TableHead key={targetUser.id} className="text-center">
                  Pot veure la bústia de <br/>
                  <span className="font-semibold">{targetUser.full_name || targetUser.email}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map(granteeUser => (
              <TableRow key={granteeUser.id}>
                <TableCell className="font-semibold">{granteeUser.full_name || granteeUser.email}</TableCell>
                {teamMembers.map(targetUser => {
                  if (granteeUser.id === targetUser.id) {
                    return <TableCell key={targetUser.id} />;
                  }
                  const isChecked = permissions.some(p => p.grantee_user_id === granteeUser.id && p.target_user_id === targetUser.id);
                  return (
                    <TableCell key={targetUser.id} className="text-center">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => handlePermissionChange(granteeUser.id, targetUser.id, !!checked)}
                        // ✅ 4. Desactivem si no pot gestionar
                        disabled={!canManage || isPending}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-end p-4 border-t">
        {/* ✅ 5. Desactivem el botó si no pot gestionar */}
        <Button onClick={handleSave} disabled={isPending || !canManage}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Desar Permisos
        </Button>
      </CardFooter>
    </Card>
  );
}