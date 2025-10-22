"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils/utils";

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
        iphone: "bg-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface DashboardCardProps extends VariantProps<typeof cardHeaderVariants> {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}

export function DashboardCard({ title, icon: Icon, children, className, variant, defaultOpen = true, actions }: DashboardCardProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("rounded-xl border bg-card text-card-foreground shadow-lg overflow-hidden transition-all duration-300", className)}
    >
      <div className={cn(cardHeaderVariants({ variant }))}>
        <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-primary-foreground/80" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        {/* ✅ CORRECCIÓ: Canviat 'bg-white' a 'bg-card' per adaptar-se al tema */}
        <div className="p-6 bg-card flex flex-col h-full">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}