// @/app/[locale]/(app)/excel/types.ts
import { type LucideIcon } from "lucide-react";

/**
 * Defineix la forma d'una opció del desplegable d'Excel.
 */
export interface DropdownOption {
  value: string;
  label: string;
  icon: LucideIcon | React.ElementType;
}