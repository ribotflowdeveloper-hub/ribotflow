"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Product } from "../page";

interface ProductsCardViewProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void; // Canviat per acceptar només l'ID
}

export function ProductsCardView({ products, onEdit, onDelete }: ProductsCardViewProps) {
  // Agrupem productes per categoria
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || "Sense Categoria";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedProducts).map(([category, productsInCategory]) => (
        <div key={category}>
          <h2 className="text-xl font-bold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsInCategory.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description || "Sense descripció."}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="font-mono text-2xl font-bold">€{product.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Unitat: {product.unit || "N/A"} | IVA: {product.iva || 0}%</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(product)}><Edit className="mr-2 h-4 w-4"/>Editar</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(product.id)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}