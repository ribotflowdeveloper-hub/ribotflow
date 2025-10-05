// @/app/[locale]/(app)/crm/contactes/[id]/_components/EditableField.tsx
import React from 'react';
import { Label } from '@/components/ui/label';

interface EditableFieldProps {
    label: string;
    isEditing: boolean;
    viewValue: React.ReactNode;
    editComponent: React.ReactNode;
    className?: string;
}

/**
 * Component per mostrar un camp que pot ser visualitzat o editat.
 * Encapsula la lògica de renderitzar un <p> o un component d'edició (<Input>, <Select>, etc.)
 */
export const EditableField: React.FC<EditableFieldProps> = ({ label, isEditing, viewValue, editComponent, className }) => {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label>{label}</Label>
            {isEditing ? (
                editComponent
            ) : (
                <p className="text-lg pt-2 min-h-[42px] flex items-center text-foreground">
                    {viewValue}
                </p>
            )}
        </div>
    );
};