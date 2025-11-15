// /app/[locale]/(app)/crm/products/[productId]/_components/ProductDetailView.tsx (FITXER CORREGIT)
"use client";

import { useTranslations } from 'next-intl';
// ✅ CORRECCIÓ: Importem el tipus des del SERVEI
import type { Product } from '@/lib/services/finances/products/products.service'; 
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator'; 

interface ProductDetailViewProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

// ... (component LabelText es manté igual) ...
function LabelText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base break-words">{children || '-'}</p>
    </div>
  );
}

export function ProductDetailView({ product, onEdit, onDelete }: ProductDetailViewProps) {
  const t = useTranslations('ProductDetailPage'); // Canviat a 'ProductDetailPage' (detall)
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('backToList')}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            
            <div className="space-y-2">
              <CardTitle>{product.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <CardDescription>{product.category}</CardDescription>
                )}
                <Badge variant={product.is_active ? "default" : "destructive"} className={undefined}>
                  {product.is_active ? t('active') : t('inactive')}
                </Badge>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex gap-2">
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('actions.delete')}
              </Button>
              <Button onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                {t('actions.edit')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {product.description && (
            <>
              <div>
                <LabelText label={t('form.descriptionLabel')}>{product.description}</LabelText>
              </div>
              <Separator />
            </>
          )}

          <div className="grid gap-6 grid-cols-2 md:grid-cols-3">
            <LabelText label={t('table.price')}>{formatCurrency(product.price ?? 0)}</LabelText>
            <LabelText label={t('table.vat')}>{product.legacy_tax_rate !== null ? `${product.legacy_tax_rate}%` : '-'}</LabelText>
            <LabelText label={t('form.discountLabel')}>{product.discount !== null ? `${product.discount}%` : '-'}</LabelText>
            <LabelText label={t('table.unit')}>{product.unit}</LabelText>
            <LabelText label={t('table.created')}>{product.created_at ? formatDate(product.created_at) : '-'}</LabelText>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}