// src/components/shared/ModuleCard.tsx

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/utils";

// Els estils de CVA es mantenen igual.
const cardHeaderVariants = cva(
  "flex items-center justify-between p-2 text-primary-foreground rounded-t-xl",
  {
    variants: {
      variant: {
        default: "bg-primary",
        sales: "bg-blue-600",
        agenda: "bg-green-700",
        activity: "bg-orange-500",
        radar: "bg-purple-600",
        invoices: "bg-red-600",
        quotes: "bg-teal-600",
        tasks: "bg-yellow-600",
        inbox: "bg-indigo-600",
        info: "bg-blue-600",
        success: "bg-green-700",
        warning: "bg-yellow-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// ✅ 1. Afegim les noves propietats a la interfície.
interface ModuleCardProps extends VariantProps<typeof cardHeaderVariants> {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  isCollapsible?: boolean; // Per controlar el botó de desplegar.
  isVisible?: boolean;     // Per controlar la visibilitat total.
}

export function ModuleCard({ 
  title, 
  icon: Icon, 
  children, 
  className, 
  variant, 
  defaultOpen = true, 
  actions,
  // ✅ 2. Definim els valors per defecte de les noves props.
  isCollapsible = true,
  isVisible = true 
}: ModuleCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // ✅ 3. Lògica de visibilitat. Si isVisible és false, no renderitzem res.
  // Aquesta és la manera més neta de gestionar l'ocultació d'un component.
  if (!isVisible) {
    return null;
  }

  return (
    <Collapsible
      // Si no és desplegable, sempre estarà obert. Altrament, respectem l'estat.
      open={!isCollapsible || isOpen} 
      onOpenChange={setIsOpen}
      // La propietat 'disabled' és perfecta per a aquest cas d'ús.
      // Evita que l'usuari pugui interactuar amb el desplegable si no volem.
      disabled={!isCollapsible}
      className={cn("rounded-xl border bg-card text-card-foreground shadow-lg overflow-hidden transition-all duration-300", className)}
    >
      <div className={cn(cardHeaderVariants({ variant }))}>
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary-foreground/80" />
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          
          {/* ✅ 4. Renderitzem el botó de desplegar NOMÉS si isCollapsible és true. */}
          {isCollapsible && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 h-8 w-8">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="p-4 md:p-6 bg-card flex flex-col h-full">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}