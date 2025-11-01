"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/utils";

// ... (variants de CVA no canvien) ...
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
        invoices: "bg-teal-500",
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

interface ModuleCardProps extends VariantProps<typeof cardHeaderVariants> {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  isCollapsible?: boolean;
  isVisible?: boolean; 
}

export function ModuleCard({ 
  title, 
  icon: Icon, 
  children, 
  className, 
  variant, 
  defaultOpen = true, 
  actions,
  isCollapsible = true,
  isVisible = true 
}: ModuleCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (!isVisible) {
    return null;
  }

  return (
    <Collapsible
      open={!isCollapsible || isOpen} 
      onOpenChange={setIsOpen}
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
          
          {isCollapsible && (
            <CollapsibleTrigger asChild>
              <Button 
                // ✅ --- AQUESTA ÉS LA CORRECCIÓ ---
                type="button" 
                // ✅ --- FI DE LA CORRECCIÓ ---
                variant="ghost" 
                size="icon" 
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 h-8 w-8"
              >
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