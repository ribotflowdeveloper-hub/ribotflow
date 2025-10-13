"use client";

import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/utils";

interface DashboardCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode; // ✅ 1. Afegim la nova prop opcional
}

export function DashboardCard({
  title,
  icon: Icon,
  children,
  className,
  defaultOpen = true,
  actions, // ✅ 2. La rebem aquí
}: DashboardCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        {/* ✅ 3. Creem un contenidor per a les accions i el botó de col·lapse */}
        <div className="flex items-center gap-1">
          {actions}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="p-6 pt-0">
            {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}